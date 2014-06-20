# UUIDs.net

**An anonymous and highly secure network storage service**

[UUIDs](https://uuids.net) is a network file server with built-in security. It relies on [Node.js](http://nodejs.org/) and has been tested on Mac OS X and Ubuntu Linux. Unlike most file storage services...
* It never stores usernames (or passwords of course)
* Uploaded files are *immediately* zipped and encrypted
* All data tags associated with files are also encrypted
* Shared buckets and files are accessed via anonymous UUIDs

The system is architected to store as little information as possible about its users. It **encrypts all stored data** in such a way that nobody may decrypt it without the user's account name and password, not even the system administrator.

See [API](API.md) for more info.
