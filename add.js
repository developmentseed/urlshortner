#!/usr/bin/env node

'use strict';
const AWS = require('aws-sdk');
const parseArgs = require('minimist');
const url = require('url');
const path = require('path');

// configuration to be customized
let profile = null;
let bucket = process.env['S3_BUCKET'] || 'ds-io-urlshortner';
let region = process.env['S3_REGION'] || 'us-east-1';
let domain = 'ds.io';
const key = process.env['KEY_SHORT'] || 'u';

function randomId () {
  let name = '';
  for (let i = 0; i < 7; i +=1) {
    name += (Math.random()*36|0).toString(36);
  }
  return name;
}

function getS3() {
  if (profile) {
    const creds = new AWS.SharedIniFileCredentials({ profile });
    AWS.config.credentials = creds;
  }

  return new AWS.S3({ region });
}

function writeObject(name, link, cb) {
  const s3 = getS3();
  s3.putObject({
    Bucket: bucket,
    Key: path.join(key, name),
    Body: '',
    WebsiteRedirectLocation: link,
    ContentType: 'text/plain'
  }, (e, d) => {
    if (e) {
      return cb(e);
    }

    cb(null, `https://${domain}/${name}`);
  });
}

function addToS3(link, name = null, override = false, cb = () => {}) {
  if (!name) {
    name = randomId();
  }

  const s3 = getS3();

  // check if the object already exist
  s3.headObject({ Bucket: bucket, Key: path.join(key, name) }).promise().then(() => {
    // if it exists override if the flag is true
    if (override) {
      writeObject(name, link, cb);
    }
    else {
      console.log(`ignoring ${name}. Already exists`);
    }
  }).catch((e) => {
    if (e.code === 'NotFound') {
      writeObject(name, link, cb);
    } else {
      throw e;
    }
  });
}

function error(msg) {
  console.log(`Error: ${msg}`);
  process.exit(1);
}

function commander(args) {
  let name = null;
  let override = false;

  if (args._.length === 0) {
    error('main argument link is missing');
  }

  if (args._.length > 1) {
    error('more than one link is provided');
  }

  if (args.profile) {
    profile = args.profile;
  }

  if (args.name) {
    name = args.name;
  }

  if (args.region) {
    region = args.region;
  }

  if (args.bucket) {
    bucket = args.bucket;
  }

  if (args.domain) {
    domain = args.domain;
  }

  if (args.override) {
    override = args.override;
  }

  addToS3(args._[0], name, override, (e, r) => {
    if (e) {
      console.log(e);
      process.exit(1);
    }

    console.log(r);
  });
}

const args = parseArgs(process.argv.slice(2));
commander(args);
