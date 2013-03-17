package org.richardneish.crosswords.scraper;

import com.gargoylesoftware.htmlunit.*;
import com.gargoylesoftware.htmlunit.html.*;
import com.gargoylesoftware.htmlunit.util.*;

import java.io.*;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.logging.Logger;

import org.richardneish.htmlunit.FourOhFourWebResponse;

public class TelegraphScraper {
  private static final Logger log = Logger.getLogger(TelegraphScraper.class.getName());

  private final String username;
  private final String password;

  private String crosswordHtml;
  private String solutionHtml;

  public enum Type {
    QUICK("Quick Crossword"),
    CRYPTIC("Cryptic Crossword");

    public final String optionText;
    Type(String optionText) {
      this.optionText = optionText;
    }
  };

  public static final void main(String[] args) {
    try {
      Date date = new SimpleDateFormat("yyyy-MM-dd").parse(args[0]);
//      for (Type type : Type.values()) {
      for (Type type : new Type[] {Type.QUICK}) {
        TelegraphScraper scraper = new TelegraphScraper(System.getenv("TC_USERNAME"), System.getenv("TC_PASSWORD"));
        scraper.doScrape(type, date);
        new FileWriter("c:\\temp\\crossword.html").write(scraper.getCrosswordHtml());
        new FileWriter("c:\\temp\\crossword_solution.html").write(scraper.getSolutionHtml());
      }
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  public TelegraphScraper(String username, String password) {
    this.username = username;
    this.password = password;
  }

  public void doScrape(Type type, Date date) {
    try {
      WebClient wc = new WebClient(BrowserVersion.FIREFOX_17);
      WebClientOptions options = wc.getOptions();
      options.setJavaScriptEnabled(true);
      options.setCssEnabled(true);
      options.setThrowExceptionOnScriptError(false);
      options.setThrowExceptionOnFailingStatusCode(false);
      wc.waitForBackgroundJavaScriptStartingBefore(5000);

//      wc.setWebConnection(createWebConnection(wc));

      log.info("Login.");
      HtmlPage page = wc.getPage("http://puzzles.telegraph.co.uk/");
      log.info("Login page loaded.");
      ((HtmlInput)page.querySelector("#email")).setValueAttribute(username);
      log.info("Email set.");
      ((HtmlInput)page.querySelector("#password")).setValueAttribute(password);
      log.info("Password set.");
      page = (HtmlPage)((HtmlElement)page.querySelector("img[alt=Login]").getParentNode()).click();
      log.info("Logging in.");

      // Go to the search page.
      page.save(new File("c:\\temp\\htmlunit"));
      System.exit(1);
      page = (HtmlPage)((HtmlElement)page.querySelector("a[title=\"Crossword Puzzles\"]")).click();
      log.info("Opening search page.");

      // Search for specified puzzle type and date.
      String[] dateParts = new SimpleDateFormat("dd MMMM yyyy").format(date).split(" ");
      log.info("Searching for puzzleType=[" + type.optionText + "], dayDate=[" +
        dateParts[0] + "], monthDate=[" + dateParts[1] + "], yearDate=[" +
        dateParts[2] + "].");
      selectOption(page, "puzzleType", type.optionText);
      selectOption(page, "dayDate", dateParts[0]);
      selectOption(page, "monthDate", dateParts[1]);
      selectOption(page, "yearDate", dateParts[2]);
      page = (HtmlPage)((HtmlElement)page.querySelector("img.button")).click();
      log.info("Submitting search.");

      // Go to puzzle.
      page = (HtmlPage)((HtmlAnchor)page.querySelector("a span.bold").getParentNode()).click();
      log.info("Opening puzzle.");

      // Get crossword and solution links.
      page.save(new File("c:\\temp\\htmlunit"));
      System.exit(1);
      HtmlAnchor crosswordLink = null;
      HtmlAnchor solutionLink = null;

      log.info("Crossword link: " + crosswordLink);
      log.info("Solution link: " + solutionLink);

      // Download puzzle.
      if (crosswordLink != null) {
        page = wc.getPage(crosswordLink.getHrefAttribute());
        log.info("Saved crossword.");
        crosswordHtml = page.getDocumentElement().asXml();
      }

      // Download solution.
      if (solutionLink != null) {
        page = wc.getPage(solutionLink.getHrefAttribute());
        log.info("Saved solution.");
        solutionHtml = page.getDocumentElement().asXml();
      }

    } catch (IOException ioe) {
      // TODO: Throw a ScraperException instead.
      throw new RuntimeException(ioe);
    }
  }

  private WebConnection createWebConnection(WebClient client) {
    return new WebConnectionWrapper(client) {
      @Override
      public WebResponse getResponse(final WebRequest request) throws IOException {
        if (!request.getUrl().getHost().contains("telegraph.co.uk")) {
          return new FourOhFourWebResponse(request.getUrl(), request.getHttpMethod());
        }
        return super.getResponse(request);
      }
    };
  }

  private void selectOption(HtmlPage page, String selectName, String optionText) {
      HtmlSelect select = (HtmlSelect)page.querySelector("select[name=\"" + selectName + "\"]");
      select.setSelectedAttribute(select.getOptionByText(optionText), true);
  }

  public String getCrosswordHtml() {
    return crosswordHtml;
  }

  public String getSolutionHtml() {
    return solutionHtml;
  }
}
