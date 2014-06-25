# UUIDs.net API

### POST /signup

Create a new account. Be sure to pass SHA or MD5 digests of your chosen account name and password. Get your invitation by tweeting to [@uuids](https://twitter.com/uuids).

| Param          | Type   | Description                                        |
|----------------|--------|----------------------------------------------------|
| nameDigest     | String | SHA or MD5 digest of your chosen account name      |
| passwordDigest | String | SHA or MD5 digest of your chosen password          |
| invitation     | String | Request an invitation at https://twitter.com/uuids |

#### Example request
```
curl --data "nameDigest=$nameDigest&passwordDigest=$passwordDigest&invitation=$invitation" \
https://uuids.net/signup
```

#### Example response
```
{session: '9a5c4dde-4330-45e5-883f-4f78a06ce9bd'}
```

### POST /password

Change your account password.

| Param             | Type   | Description                                     |
|-------------------|--------|-------------------------------------------------|
| nameDigest        | String | SHA or MD5 digest of your account name          |
| passwordDigest    | String | SHA or MD5 digest of your current password      |
| newPasswordDigest | String | SHA or MD5 digest of your new password          |

#### Example request
```
curl --data "nameDigest=$nameDigest&passwordDigest=$passwordDigest&newPasswordDigest=$newPasswordDigest" \
https://uuids.net/password
```

#### Example response
```
{session: '356aaad8-da18-4ff7-a8bb-8ed49a1b8589'}
```

### POST /signin

Sign in by providing the SHA or MD5 digests of your account name and password.

| Param          | Type   | Description                                        |
|----------------|--------|----------------------------------------------------|
| nameDigest     | String | SHA or MD5 digest of your account name             |
| passwordDigest | String | SHA or MD5 digest of your password                 |

#### Example request
```
curl --data "nameDigest=$nameDigest&passwordDigest=$passwordDigest" \
https://uuids.net/signin
```

#### Example response
```
{session: '4c69ccc8-f04d-433b-b120-e1924faad790'}
```

### POST /logout

Logout to end your current session. This is obviously important for your security.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session -X POST \
https://uuids.net/logout
```

#### Example response
```
{ ok: true }
```

### POST /leave

BEWARE! This will delete the account *and* all buckets and files associated with the account.

| Param          | Type   | Description                                        |
|----------------|--------|----------------------------------------------------|
| nameDigest     | String | SHA or MD5 digest of your account name             |
| passwordDigest | String | SHA or MD5 digest of your password                 |
 
#### Example request
```
curl --data "nameDigest=$nameDigest&passwordDigest=$passwordDigest" \
https://uuids.net/leave
```

#### Example response
```
{ ok: true }
```

### POST /bucket/{bucketName}

Create a new bucket. Your bucket name should be URL-encoded so that characters like spaces and slashes are correctly processed by the server. For example, in JavaScript use the ```encodeURIComponent``` function.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session -X POST \
https://uuids.net/bucket/MyNewBucket
```

#### Example response
```
{ bucket: 
   { name: 'MyNewBucket',
     uuidDigest: 'e90f05850a0bbbeeda0b601c97e683e7fb0ef28d' } }
```

### GET /buckets

Get a list of all buckets in the account.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session \
https://uuids.net/buckets
```

#### Example response
```
{ buckets: 
   { MyNewBucket: { created: 1402629846179 },
     OtherBucket: { created: 1402629846192 } } }
```

### GET /bucket/{bucketName}

Get details about a particular bucket.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session \
https://uuids.net/bucket/MyNewBucket
```

#### Example response
```
{ bucket: 
   { name: 'MyNewBucket',
     uuidDigest: '5c39500c183bbc6cf75c6a83b24e22d58ad400ec',
     files: {
        MyNewFile: {size: 0, reads: 0, writes: 0, created: 1402630192022, updated: 1402630192022},
        OtherFile: {size: 0, reads: 0, writes: 0, created: 1402630192043, updated: 1402630192043} } } }
     shares: {},
     created: 1402629846179 } }
```

### POST /bucket/{bucketName}/rename/{newBucketName}

Rename a bucket.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session -X POST \
https://uuids.net/bucket/MyNewBucket/rename/MyBestBucket
```

#### Example response
```
{ bucket: 
   { name: 'MyBestBucket',
     uuidDigest: '20f885cb01695c7bc16fd6d90f6e79b55f628bf4' } }
```

### POST /bucket/{bucketName}/delete

Delete a bucket. (We use "POST" instead of "DELETE" to be compatible with web browsers).

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session -X POST \
https://uuids.net/bucket/MyBestBucket/delete
```

#### Example response
```
{ bucket: 
   { name: 'MyBestBucket',
     uuidDigest: '20f885cb01695c7bc16fd6d90f6e79b55f628bf4' } }
```

### POST /bucket/{bucketName}/file/{filename}

Upload a file. Immediately upon receipt it is zipped and encrypted on the server.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session --form file=@myfile.txt \
https://uuids.net/bucket/MyBestBucket/file/MyNewFile

```

#### Example response
```
{ file: 
   { name: 'MyNewFile',
     size: 4625,
     type: 'text/plain',
     uuidDigest: 'e86d696b737e3b79f27c2abb7410d5dc640d2b0e' } }
```
Note that the name of the file is not recorded; only its contents are stored.

### GET /bucket/{bucketName}/file/{filename}

Get the contents of a file in a bucket.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session \
https://uuids.net/bucket/MyBestBucket/file/MyNewFile
```

#### Example response
```
Some text that was uploaded earlier.
```

### POST /bucket/{bucketName}/file/{filename}/data

Set data tags for a file. These are essentially key/value pairs that you would like to securely store. A tag may be anything at all, up to 2048 bytes in length. Its value may be up to 16384 bytes in length.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

POST a single parameter ```data``` whose value is JSON tag/value pairs like ```{"a":1,"b":2}```

#### Example request
```
curl --user $nameDigest:$session --data 'data={"a":1,"b":2}' \
https://uuids.net/bucket/MyBestBucket/file/MyNewFile/data
```

#### Example response
```
{ file: 
   { name: 'MyNewFile',
     uuidDigest: 'b9c9f7a15dd388c9976d46ff76218441baadf61d' } }
```

### GET /bucket/{bucketName}/file/{filename}/{dataTag}

Get a data tag that was associated with a file, e.g. "a". A tag may be anything at all, up to 2048 bytes in length. Its value may be up to 16384 bytes in length.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session \
https://uuids.net/bucket/MyBestBucket/file/MyNewFile/a
```

#### Example response
```
{ file: 
   { name: 'MyNewFile',
     uuidDigest: 'a690e7d00bb376e35740bb05beb392ebf2c359a8',
     data: { a: 1 } } }
```

### POST /bucket/{bucketName}/file/{filename}/rename/{newFilename}

Rename a file.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session -X POST \
https://uuids.net/bucket/MyBestBucket/file/MyNewFile/rename/MyBestFile
```

#### Example response
```
{ file: 
   { name: 'MyBestFile',
     uuidDigest: 'b00540a8d19af6b77c51cfafd3c1460b165c0578' } 
```

### POST /bucket/{bucketName}/file/{filename}/delete

Delete a file.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session -X POST \
https://uuids.net/bucket/MyBestBucket/file/MyBestFile/delete
```

#### Example response
```
{ file: 
   { name: 'MyBestFile',
     uuidDigest: 'b00540a8d19af6b77c51cfafd3c1460b165c0578' } 
```

### POST /bucket/{bucketName}/share

Share a bucket. Note the ```uuid``` that is returned. This is required to access the shared bucket.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session -X POST \
https://uuids.net/bucket/MyBestBucket/share
```

#### Example response
```
{ bucket: 
   { name: 'MyBestBucket',
     uuidDigest: 'b76ed9b792b445d1a17e532df3736c5bd1785872',
     share: 
      { type: 'bucket',
        name: 'MyBestBucket',
        uuid: '30ed38a1-94b1-4030-b2d5-0e418ab9816b' } } }
```
Here, the bucket share UUID is ```30ed38a1-94b1-4030-b2d5-0e418ab9816b```.

### POST /bucket/{bucketName}/file/{filename}/share

Share a file. Note the ```uuid``` that is returned. This is required to access the shared file.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session -X POST \
https://uuids.net/bucket/MyBestBucket/file/MyNewFile/share
```

#### Example response
```
{ bucket: 
   { name: 'MyBestBucket',
     uuidDigest: 'b76ed9b792b445d1a17e532df3736c5bd1785872',
     share: 
      { type: 'file',
        name: 'MyNewFile',
        uuid: '42b3c78f-f255-4ee2-985c-2175320c80b8' } } }
```
Here, the file share UUID is ```42b3c78f-f255-4ee2-985c-2175320c80b8```.

### GET /shared/bucket/{bucketShareUUID}

Get a shared bucket. Here we request the bucket corresponding to share UUID ```30ed38a1-94b1-4030-b2d5-0e418ab9816b``` (see above).

#### Example request
```
curl --user $nameDigest:$session \
https://uuids.net/shared/bucket/30ed38a1-94b1-4030-b2d5-0e418ab9816b
```

#### Example response
```
{ bucket: 
   { name: 'MyBestBucket',
     uuidDigest: '5c39500c183bbc6cf75c6a83b24e22d58ad400ec',
     files: {
        MyNewFile: {size: 0, reads: 0, writes: 0, created: 1402630192022, updated: 1402630192022},
        OtherFile: {size: 0, reads: 0, writes: 0, created: 1402630192043, updated: 1402630192043} } } }
```

### GET /shared/bucket/{bucketShareUUID}/file/{filename}

Get a content of a file in a shared bucket. Here we request the bucket corresponding to share UUID ```30ed38a1-94b1-4030-b2d5-0e418ab9816b``` (see above).

#### Example request
```
curl --user $nameDigest:$session \
https://uuids.net/shared/bucket/30ed38a1-94b1-4030-b2d5-0e418ab9816b/file/MyNewFile
```

#### Example response
```
Some text that was uploaded earlier.
```

### GET /shared/bucket/{bucketShareUUID}/file/{filename}/{dataKey}

Get a data tag for a file in a shared bucket. Here we request the bucket corresponding to share UUID ```30ed38a1-94b1-4030-b2d5-0e418ab9816b``` and request the file data tag "a".

#### Example request
```
curl --user $nameDigest:$session \
https://uuids.net/shared/bucket/30ed38a1-94b1-4030-b2d5-0e418ab9816b/file/MyNewFile/a
```

#### Example response
```
{ file: 
   { name: 'MyNewFile',
     uuidDigest: '58b0d4fcda470081eef187df71e270ef8aae0156',
     data: { a: 1 } } }
```

### GET /shared/file/{fileShareUUID}/{dataTag}

Get a data tag for a shared file. Here we request the file corresponding to file share UUID ```42b3c78f-f255-4ee2-985c-2175320c80b8``` and data tag "a".

#### Example request
```
curl --user $nameDigest:$session \
https://uuids.net/shared/file/42b3c78f-f255-4ee2-985c-2175320c80b8/a
```

#### Example response
```
{ file: 
   { name: 'MyNewFile',
     uuidDigest: '58b0d4fcda470081eef187df71e270ef8aae0156',
     data: { a: 1 } } }
```

### GET /shared/file/{fileShareUUID}

Get the contents of a shared file. Here we request the file corresponding to share UUID ```42b3c78f-f255-4ee2-985c-2175320c80b8```.

#### Example request
```
curl --user $nameDigest:$session \
https://uuids.net/shared/file/42b3c78f-f255-4ee2-985c-2175320c80b8
```

#### Example response
```
Some text that was uploaded earlier.
```

### GET /quota/{quotaUpgradeUUID}

Claim a quota upgrade (identified by a quota upgrade UUID).

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session https://uuids.net/quota/c9c4ff98-9d40-4737-b547-492033aebc3f
```

#### Example response
```
{ usage: 
   { quota: 80000000,
     stored: 9764,
     input: 3510,
     output: 7016,
     total: 20290 } }
```

### GET /usage

Get details about the account usage including bytes input, output and stored.

Use basic auth to send ```nameDigest``` (username) and ```session``` (password).

#### Example request
```
curl --user $nameDigest:$session https://uuids.net/usage
```

#### Example response
```
{ usage: 
   { quota: 10000000,
     stored: 9764,
     input: 3510,
     output: 7016,
     total: 20290 } }
```

### GET /version

Get the API version of the UUIDs service.

#### Example request
```
curl https://uuids.net/version
```

#### Example response
```
{ version: '1.0.0' }
```
