#!/bin/bash

# Set up environment
#export TC_USERNAME=
#export TC_PASSWORD=
export TC_BASEDIR=/var/www/crosswords/html/
export TC_TYPE=cryptic
export TC_DATE=`date --date=@$((\`date +%s\` - 24 * 60 * 60)) +%Y-%m-%d`

# Download yesterday's crosswords to temp folder.
phantomjs TelegraphScraper/src/main/javascript/telegraph.js

# Convert downloaded HTML files to PUZ format.
java -cp  \
  TelegraphHTMLtoPUZ/TelegraphHTMLToPUZ.jar:TelegraphHTMLtoPUZ/lib/jabberwordy.jar:TelegraphHTMLtoPUZ/lib/jsoup-1.7.2.jar \
  org.richardneish.crosswords.converter.TelegraphHTMLToPUZ \
    /var/www/crosswords/html/${TC_TYPE}_${TC_DATE}.html \
    /var/www/crosswords/html/${TC_TYPE}_${TC_DATE}_solution.html \
    /var/www/crosswords/${TC_TYPE}_${TC_DATE}.puz

