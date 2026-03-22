# YouTube Watch Tracker
Real simple: This Chromium-based extension records all the YouTube videos (i.e., youtube.com/watch?v=... URLs) loaded in an active tab of the configured browser. URLs are listed in the extention's popup by descending order of time accessed, with title, accessed timestamp, and associated YouTube handle mentioned.\
![Screenshot of extension](https://github.com/iancappelletti/YouTube-Watch-Tracker/blob/master/images/youtube-watch-tracker-screenshot.PNG)\
The list can be shared in JSON format via the green button, with additional video data included. To illustrate:<br/>
`
[
  {
    "channelUrl": "https://www.youtube.com/@MTV",
    "handle": "@MTV",
    "timestamp": "2026-03-21T15:31:01.089Z",
    "title": "Nick Jonas & Awkwafina Have 3 Front Teeth | Girl Code Live | MTV",
    "url": "https://www.youtube.com/watch?v=dLv5Vt34GTI",
    "videoId": "dLv5Vt34GTI"
  },
  {
    "channelUrl": "https://www.youtube.com/@ProjectEmortal",
    "handle": "@ProjectEmortal",
    "timestamp": "2026-03-21T08:32:09.450Z",
    "title": "The RAGE GAME Where You Play As An EGG",
    "url": "https://www.youtube.com/watch?v=rDlScvFBn_8",
    "videoId": "rDlScvFBn_8"
  },
  {
    "channelUrl": "https://www.youtube.com/@ProjectEmortal",
    "handle": "@ProjectEmortal",
    "timestamp": "2026-03-21T08:30:02.628Z",
    "title": "The RAGE GAME Where You Play As An EGG",
    "url": "https://www.youtube.com/watch?v=rDlScvFBn_8",
    "videoId": "rDlScvFBn_8"
  }
]
`