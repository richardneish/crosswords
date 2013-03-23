var env=require('system').env;
var fs=require('fs');
var page = createPage();

function createPage() {
  var page = require('webpage').create();

  page.settings.loadImages=false;
  page.settings.userAgent='Mozilla/5.0 (Windows NT 5.1; rv:19.0) Gecko/20100101 Firefox/19.0';
  page.onConsoleMessage = function(msg, lineNum, sourceId) {
      console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
  };
  return page;
}

var state = {};
function reset() {
  state = {};
}

function fail(msg) {
  console.log(msg);
  phantom.exit();
}

function snapshot(name) {
  page.render('c:/temp/snapshots/' + name + '.png');
  fs.write('c:/temp/snapshots/' + name + '.html', page.content, 'w');
}

function yesterday() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

function dateToString(date) {
  var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var dayString = days[date.getDay()];
  var dayOfMonthString = new String(date.getDate());
  var monthString = months[date.getMonth()];
  var yearString = new String(date.getFullYear()).slice(2, 4);
  return dayString + ' ' + dayOfMonthString + ' ' + monthString + ' ' + yearString;
}

function isLoggedIn() {
  return page.evaluate(function() {
    // If the login form is shown, enter user details and submit.
    var welcomeText = document.querySelector('#welcome_message.orange span.bold').textContent;
    console.log('Welcome text: ' + welcomeText);
    if (typeof(welcomeText) === 'undefined') {
      fail('Welcome message not found.');
    } else if (welcomeText.indexOf('Hello Guest') === 0) {
      return false;
    } else if (welcomeText.indexOf('Welcome back') === 0) {
      return true;
    }
    fail('Welcome message not found.');
    return false;
  });
}

function login(next_step) {
  var username=env['TC_USERNAME'];
  var password=env['TC_PASSWORD'];
  if (null === username || '' === username) {
    fail('Username is missing');
  }
  page.open('http://puzzles.telegraph.co.uk/', function(status) {
    if (status != 'success') {
      fail('Unable to open page.');
    } else {
      snapshot('Login_form');
      console.log('Logging in');
      if (!isLoggedIn()) {
        page.evaluate(function(username, password) {
          document.querySelector('#email').setAttribute('value', username);
          document.querySelector('#password').setAttribute('value', password);
          // document.querySelector('input.checkbox[name*=remember_me]').setAttribute('checked', true);
          console.log('Submitting form');
          document.login.submit();
        }, username, password);
        console.log('Login submitted.');
        page.onLoadFinished=function() {
          page.onLoadFinished=undefined;
          console.log('Form submit completed.');
          if (!isLoggedIn()) {
            fail('Failed login.');
          } else {
            next_step();
          }
        };
      } else {
        console.log('Logged in already.');
        next_step();
      }
    }
  });
}

function search(next_step) {
  console.log('In search()');
  var dateString = dateToString(state['date']);
  console.log('Searching for puzzle type: ' + state['type'] +
    ', for date: ' + dateString);
  // Cookies have been set by login(), so we can go straight to the crossword page.
  page.open('http://puzzles.telegraph.co.uk/site/crossword_puzzles_' +
    state['type'], function(status) {
    console.log('Search page loaded.  Logged in:' + isLoggedIn());
    snapshot('search');
    state['puzzle_id'] = page.evaluate(function(dateString) {
      // Get the link for given date.
      var links = document.querySelectorAll('table#search_results_table a');
      for (var i=1; i<links.length; i+=3) {
        console.log('link: ' + links[i].textContent + ' / ' + links[i].getAttribute('href'));
        if (links[i].textContent == dateString) {
          var link_href=links[i].getAttribute('href');
          console.log('Found link.  Href=' + link_href);
          var pos = link_href.indexOf('?id=');
          if (pos === -1) {
            console.log('Failed to find puzzle id.');
            return null;
          }
          var puzzle_id=link_href.substring(pos+4);
          return puzzle_id;
        }
      }
      return null;
    }, dateString);
    if (state['puzzle_id'] === null) {
      fail('Failed to find puzzle id.');
    }
    console.log('Got puzzle_id: [' + state['puzzle_id'] + ']');
    next_step();
  });  
}

function download_puzzle(next_step) {
  var puzzle_link='http://puzzles.telegraph.co.uk/site/print_crossword.php?id=' +
    state['puzzle_id'];
  console.log('Downloading ' + state['type'] + ' crossword from link ' + puzzle_link);
  page.open(puzzle_link, function(status) {
    if (status === 'success') {
      console.log('Downloaded puzzle HTML with length:' + page.content.length);
      state['puzzle_html'] = page.content;
      next_step();
    } else {
      fail('Failed to download puzzle.');
    }
  });
}

function download_solution(next_step) {
  var solution_link='http://puzzles.telegraph.co.uk/site/print_crossword.php?id=' +
    state['puzzle_id'] + '&action=solution';
  console.log('Downloading ' + state['type'] + ' solution from link ' + solution_link);
  page.open(solution_link, function(status) {
    if (status === 'success') {
      console.log('Downloaded solution HTML with length:' + page.content.length);
      state['solution_html'] = page.content;
      next_step();
    } else {
      fail('Failed to download solution.');
    }
  });
}

function process_puzzle(next_step) {
  var date = state['date'];
  var monthString = new String(date.getMonth() + 1);
  if (monthString.length === 1) {
    monthString = '0' + monthString;
  }
  var dayString = new String(date.getDate());
  if (dayString.length === 1) {
    dayString = '0' + dayString;
  }
  var basename = state['type'] + '_' + date.getFullYear() + '-' +
    monthString + '-' + dayString;

  var basedir=env['TC_BASEDIR'];
  fs.write(basedir + basename + '.html',
    state['puzzle_html'], 'w');
  fs.write(basedir + basename + '_solution.html',
    state['solution_html'], 'w');
  next_step();
}

console.log('Start of main');
login(function() {
  state['type'] = 'cryptic';
  state['date'] = yesterday(); 
  search(function() {
    download_puzzle(function() {
      download_solution(function() {
        process_puzzle(function() {
          console.log('Success.');
          phantom.exit();
        });
      });
    });
  });
});
