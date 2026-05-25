### 404 There isnt't a github page here
first thing to check is to make sure that your github visibility did not change to private. if that is the case it will not work
- go to github repository page then settings tab scroll all the way down to the danger zone
- Then also make sure it is looking at the correct branch and correct folder
	- Settings-pages-build and deployment select the correct branch and the entry point normally /root.

---
### Error loading data check internet

The file that controls this behavior is the **`service-worker.js`**
However IF without internet the app opens and runs to show you the empty shell technically it is caching the "machinery". However it is not caching the dynamic data. 

#### Background info
By default, most basic service workers are set up to pre-cache static files when the app is first installed. But when your `app.js` runs and tries to fetch new data (like a schedule JSON file or an API response), that is a separate network request. If the iPad is offline, that request fails before the app can get the data, resulting in your error.

in the service-worker the event listener controls this, every time the app needs data the event listener intercepts this and handles it. Service worker serves data from cache upon start but then loads data from the cloud in the background.