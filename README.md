# Post Call Transcription with Diarization

## What this application does

This server application uses the Vonage Voice API to handle incoming PSTN or SIP calls involving two or more participants.

Once the call concludes, the application generates and posts a conversation transcript complete with speaker diarization to accurately label each participant's dialogue.  

This sample code uses the Voice API to record a call and then submits the recorded audio to the Deepgram ASR (Automatic Speech Recognition) engine for transcription.

## Set up

### Set up your Vonage Voice API application credentials and other parameters

[Log in to your](https://dashboard.nexmo.com/sign-in) or [sign up for a](https://ui.idp.vonage.com/ui/auth/registration) Vonage APIs account.
 
Go to [Your applications](https://dashboard.nexmo.com/applications), access an existing application or [+ Create a new application](https://dashboard.nexmo.com/applications/new).

Under Capabilities section (click on [Edit] if you do not see this section):

**Enable** Voice
- Under Answer URL, **select** HTTP POST, and enter</br>
https://\<host\>:\<port\>/answer</br>
(replace \<host\> and \<port\> with the public host name and if necessary public port of the server where this sample application is running)</br>
- Under Event URL, **select** HTTP POST, and enter</br>
https://\<host\>:\<port\>/event</br>
(replace \<host\> and \<port\> with the public host name and if necessary public port of the server where this sample application is running)</br>
Note: If you are using ngrok for this sample application, the answer URL and event URL look like:</br>
https://yyyyyyyy.ngrok.xxx/answer</br>
https://yyyyyyyy.ngrok.xxx/event</br></br>

- Click on [Generate public and private key] if you did not yet create or want new ones, save the private key file in this application folder as .private.key (leading dot in the file name).</br>

- Click on [Generate new application] if you've just created the application.</br></br>

**IMPORTANT**: If you already have an existing application and just changed some parameter values including created a new public and private key set, do not forget to click on [Save changes] at the bottom of the screen.</br></br>

- If this application needs to also receive calls from PSTN, link a phone number to this application,

- If this application needs to receive calls only via SIP, there is no need to link a phone number to this application,

Please take note of your **application ID** and **linked phone number** (if any), as they are needed in the very next section.

For the next steps, you will need:</br>
- Your [Vonage API key](https://dashboard.nexmo.com/settings) (as **`API_KEY`**)</br>
- Your [Vonage API secret](https://dashboard.nexmo.com/settings), not signature secret, (as **`API_SECRET`**)</br>
- Your `application ID` (as **`APP_ID`**),</br>

### Set up your inbound SIP connection if needed

If this server application is to handle incoming SIP calls (i.e. to the Vonage API platform), set up a Programmable SIP connection as follows:</br>
access the [SIP web page](https://dashboard.vonage.com/sip-trunking),</br>
click on *+ Create New*,</br>
enter a unique domain name (no dots), e.g. "mysipdomain" (again, must be unique)</br>
click on *Create*,</br>
click on *Edit Trunk*,</br>
in the dropdown Type, select Application,</br>
then under the dropdown Application, select the application you've just created</br>
click *Save*,</br>

in the following *Outbound Calling* is from your calling application/server "point of view", not from the Vonage API platform "point of view",

within *Outbound Calling* section / Authentication, click on *Add*,</br>
use either or both _User Key and Secret_ or _Access Control List (ACL)_ fields,</br>
under _User Key and Secret_, you would enter the SIP username and SIP password as used by the calling application, then click on same line *+* sign,</br>
_under Access Control List (ACL)_, you would enter the source IP address(es) or range of source IP addresses (subnets), then click on same line *+* sign,</br>
make sure there is at least one entry in either sub-section,</br>
click on *Back*,</br>
you will see the 3 possible SIP domain URIs, your calling application will use of those SIP domain URIs, e.g. _*mysipdomain.sip-us.vonage.com*_,</br>
for example, your calling application may call into the Vonage API platform by sending a SIP INVITE to the SIP URI 12995551212@mysipdomain.sip-us.vonage.com,</br>
the substring before the @ sign in the SIP URI will be handled or may be ignored by your Voice API application because the SIP calls will be always delivered to this application whatever is the value of that substring before @ sign.</br>

### Deployment

Have Node.js installed on your system, this application has been tested with Node.js version 22.16<br>

Have this repo files copied into a folder of your server, go to that folder.<br>

Copy or rename .env-example to .env<br>
Update parameters in .env file<br>

Install node modules with the command:<br>
 ```bash
npm install
```

Launch the server application with the following command:<br>
```bash
node call-transcription.cjs 
```
Default local (not public!) `port` of this server application is: 8000.






