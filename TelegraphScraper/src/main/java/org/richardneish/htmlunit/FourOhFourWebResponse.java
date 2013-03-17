package org.richardneish.htmlunit;

import com.gargoylesoftware.htmlunit.HttpMethod;
import com.gargoylesoftware.htmlunit.WebResponse;
import com.gargoylesoftware.htmlunit.WebResponseData;
import com.gargoylesoftware.htmlunit.util.NameValuePair;

import java.net.URL;
import java.util.ArrayList;

public class FourOhFourWebResponse extends WebResponse {

  public FourOhFourWebResponse(URL url, HttpMethod requestMethod) {
    super(createWebResponseData(), url, requestMethod, 0L);
  }

  private static WebResponseData createWebResponseData() {
    return new WebResponseData(new byte[0], 404, "Not Found", new ArrayList<NameValuePair>());
  }
}
