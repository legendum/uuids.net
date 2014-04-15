UUIDs
=====

Storing private data securely and anonymously - see https://uuids.net


## Specification


### Create an account

**Requires:**
account (chosen by the user),
password_digest (digest of a password chosen by the user)

**Response:**
secret_key

The "accounts" KV store is updated to hold a new pair [digest(account):[crypt(secret_key),encrypt(meta_data, secret_key)]
and is used to authenticate operations and retrieve meta_data for the account. Crypt is used for salting.

The "secrets" KV store is updated to hold a new pair [digest(reverse(account)):[crypt(password_digest),encrypt(secret_key, password_digest)]
and is used to get a secret_key with the account and password_digest. Crypt is used for salting and we reverse the account to prevent mappings.

A new KV store is created whose name is digest(account). This is known as the account's KV store and is used for measuring usage.

Finally, a "shares" KV store holds UUIDs for shared data (see "Share an object stored in a bucket" below).


### Get the secret_key for an account

**Requires:**
account, password_digest, regenerate (optional)

**Response:**
secret_key

We lookup a KV pair whose key is digest(account) in the "secrets" KV store. If the crypted value matches the password_digest,
then the secret_key is decrypted from the value. This call may also be used to regenerate a secret_key if the current key
should become compromised. This would require decrypting and encrypting the meta data (the value in the "accounts" KV store).


### Create a bucket

**Requires:**
account, secret_key, bucket_name

**Response:**
bucket_uuid

If the account and secret_key match the "accounts" KV store, then a new KV store is created whose name is digest(bucket_uuid).
The KV [bucket_name:bucket_uuid] is stored in the account meta_data (that's why the secret_key is required).


### Put an object in a bucket

**Requires:**
account, secret_key, bucket_name, object_name, data

**Response:**
object_uuid

If the account and secret_key match the "accounts" KV store, and the bucket is found in the meta_data,
an object_uuid is generated and the value of digest(bucket_uuid+object_uuid) is calculated and known as the object_sig,
then an object whose key is digest(object_uuid) is stored in the bucket KV store with the value encrypt(data, object_sig).
The KV ["bucket_uuid+object_name":object_uuid] is stored in the account meta_data (that's why the secret_key is required).


### Share an object stored in a bucket

**Requires:**
account, secret_key, bucket_name, object_name, password (optional)

**Response:**
share_uuid

If the account and secret_key match the "accounts" KV store, and the bucket and object are found in the meta_data,
then a share_uuid is created and the KV pair [digest(share_uuid):encrypt("account_digest,bucket_uuid,object_uuid", share_uuid)]
is stored in the "shares" KV store. If a password was provided, then we replace the object_uuid with encrypt(object_uuid, password)
so the client may be prompted for a password. The share_uuid is stored in the meta_data so that it's not lost. Note that a single
object_uuid may have many share_uuids.


### Get a shared object using a UUID

**Requires:**
share_uuid, password (optional)

**Response:**
data

First we lookup the "shares" KV pair [digest(share_uuid):encrypt("account_digest,bucket_uuid,object_uuid", share_uuid)] to get
the account_digest, bucket_uuid and and object_uuid. The account_digest is used to account for usage. The bucket_uuid and object_uuid
are used to derive the object_sig, retrieve the data, decrypt the data, and return it to the client. Note that the optional password
may be required to decrypt the object_uuid.


### Get a list of buckets

**Requires:**
account, secret_key

**Response:**
List of bucket_names


### Get a list of objects in a bucket

**Requires:**
account, secret_key, bucket_name

**Response:**
List of object_names


## Implementation notes

Instead of using a single KV store for "accounts", "secrets" and "shares" it would be sensible to shard the data according to
the first 2 or 3 characters of the digest of the keys being stored.


