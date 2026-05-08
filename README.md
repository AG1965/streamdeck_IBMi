# IBM i Monitor for Stream Deck / html page

## Installation of the web service on the IBM i

Whether you use a streamdeck or just the html page, you have to somehow provide the data from the IBM i partitions.

You can use whatever you want to create the JSON data on the IBM i.

I chose to do it with php (Alan Seiden's Community Edition) and Apache.

Just copy the php/ibmimontor.php to a directory in your document root of your web server (i chose "apis") and make sure it is accessible via http(s).

Example: `https://myibmi/apis/ibmimontor.php`

In my case, no user authentication is required.

If you want to test it with e.g. a Raspberry Pi, use the ibmimonitor_mockup.php file. It is generating random data for fake LPARs and accepts a system parameter for distinctive LPAR names.

## Plugin for Elagato's Stream Deck

This plugin is retrieving JSON data from a web service running on an IBM i providing information about the system asp usage and jobs in message-wait status.

## Installation of the plugin (Windows)

You can copy the folder dev.agomb.ibmimontor.sdPlugin to the Stream Deck plugins folder. The location of the plugins folder is usually:

`%USERPROFILE%\AppData\Roaming\Elgato\StreamDeck\Plugins`

## Installation of the plugin (all other platforms)

I guess it's similar, i have no other platform to test on. See Elgato's website for infos about that.

## Configuration of the plugin

In the Stream Deck software, you can add the "IBM i Monitor" action to a button. Then you can configure the URL of the web service and the refresh interval.

Example URL: `https://myibmi/apis/ibmimontor.php`
The plugin will then retrieve the data from the web service at the specified interval and display the information on the button.

## Streamdeck using ibmimonitor_mockup

![Configuration of the plugin in Elgato's Streamdeck software.](pictures/streamdeck_configuration.png "Configuration of the Stream Deck plugin")

1. Drag the "Status" action to a button on the Stream Deck.
2. Click on the button to open the configuration and fill in the URL of the webservice providing the JSON with the LPAR info.

Repeat the steps for as many buttons as you want to monitor different LPARs. You can use the ibmimonitor_mockup.php file to test it with fake data.

![A Stream Deck with 6 keys displaying the status of 6 fake LPARs. 1 with rather high ASP usage, 3 where everything is OK and two partitions with jobs in MSGw](pictures/streamdeck_ibmimonitor.png "6 fake LPARs")

## Web page using ibmimonitor_mockup

You just have to open html/ibmimonitor.html and insert the URLs of the web service for the different LPARs in the array "endpoints". Open the page in your browser and you should see the status of the different LPARs.
(That html page is 100% ChatGPT generated.)