# Paisley

Paisley is an open-source alternative to [mailbrew](https://mailbrew.com) built with freedom in mind.

## Getting Started

At the end of this guide, you should have a CLI email digest app running on your localhost and a mail like this in your mailbox

[![paisley-screenshot.png](https://i.postimg.cc/gkj7knHh/paisley-screenshot.png)](https://postimg.cc/bsXgmYMY)

Let's get started!!

### Step 1 - Install Paisley

1. Clone this repository to your local machine with the following command ` git clone https://github.com/uduakabaci/Paisley.git`
1. Now Navigate into the directory and install the project dependencies with this command `cd Paisley && npm install`

### Step 2 - Configure Paisley

Create a file called `subscribers-schema.yaml` in Paisley's root directory with the following content

```
-
  email: youremail@gmail.com
  mails:
    -
      cron: '* * * * *'
      name: Daily Digest
      list:
        -
          base: indiehackers
          name: 'Indie Hackers'
          count: 6
        -
          base: hackernews
          name: Hacker News
          count: 6
        -
          channel: 'unixporn'
          name: 'r/unixporn'
          base: reddit
          count: 6
```

This is pretty much all Paisley needs to crawl Indie Hackers, Hacker News, and r/unixporn.

### Step 3 - Configure Paisley's Environment

For Paisley to locate the files and directories needed to run properly, you'll need to create a .env file with the following content

```
SCRAPPER_SCHEMA_FILE=scrapper-schema.yaml
SUBSCRIBERS_SCHEMA_FILE=subscribers-schema.yaml
FROM_EMAIL=paisley.mailer@gmail.com
ASSETS_URL=absolute link to the email-templates directory
VIEWS_DIR=./email-templates
MAIL_DATA_DIR=./mail-data

USERNAME=****
PASSWORD=****
HOST=****
PORT=****
```

I use SendGrid to send the emails but any other SMTP mail server is fine. Replace the USERNAME, PASSWORD, HOST, PORT values with the values provided to you by your SMTP mail server.
Also, don't forget to replace the ASSETS_URL value with the absolute link to the email-template directory in Paisley's root directory.
If you want to use Gmail, make sure to check out this [section](#how-can-do-use-gmail)

### Step 4 - Launch Paisley

Run `npm start` to launch Paisley. If you followed all the instructions, everything should work fine. When Paisley is done crawling the pages,
she will send a mail to the email specified in your subscriber-schema.yaml file which in our case is `youremail@gmail.com`. Feel free to change it to your real email.

## Architectural Design In Plain English

### Design Inspiration

The design decision for Paisley was inspired by the need for a simple, highly configurable, and easy to deploy, CLI app.
Also, I got hyped after trying out mailbrew, it just caught me. I felt I could build something similar to mailbrew for the hobbyists who would love an open-source version of it, so Paisley was born.

### Project Design

The following are the list of steps Paisley takes when it's fired up:

1. Parse the `SCRAPPER_SCHEMA_FILE` file and store it
1. For each email in the `SCRAPPER_SCHEMA_FILE`, crawl the websites
1. Save the data as files in a specified format in the `MAIL_DATA_DIR` directory
1. Read all the files in the `MAIL_DATA_DIR` directory and store it
1. Loop through the store data and send the mails

Paisley is divided into two main classes; SubcriberHandler and MailHander class.
The Subscriberhandler class takes care of parsing the config files, crawling the websites, and also storing the file in a mailable format.
The MailHandler takes care of sending the mails to the respective recipients. This is pretty much how Paisley works.

## Documentation

### Environment Variables

Paisley needs a few Environment variables to function properly

- `SCRAPPER_SCHEMA_FILE:` Link to the scrapper-schema.yaml file
- `SUBSCRIBERS_SCHEMA_FILE:` Link to the subscribers-schema.yaml file
- `FROM_EMAIL:` The email that will be used as the `from email` in email header.
- `ASSETS_URL:` Absolute link to the mail-data directory
- `VIEWS_DIR:` Link to the mail-data directory
- `USERNAME:` Your SMTP mail server username
- `PASSWORD:` Your SMTP mail server password
- `HOST:` Your SMTP mail server host
- `PORT:` Your SMTP mail server port

### Configuration Files

All the configuration files are yaml files therefore knowledge of YAML is necessary.

#### scrapper-schema.yaml

This file provides the base configuration needed to crawl websites. While the configurations in this file may be overwritten with a `config` field in
the `subscribers-schema.yaml` for the given website. Paisley requires it. For Paisley to read and parse this file, set the `SCRAPPER_SCHEMA_FILE` environment
variable to the file's link. Paisley ships with this file so you don't need to create it.

##### Example content of the file:

```
indiehackers:
  name: Indie Hackers
  website: https://indiehackers.com
  post: '.feed-item'
  link: '.feed-item__title-link'
  title: '.feed-item__title-link'
  author: '.user-link__name.user-link__name--username'
  points: '.feed-item__likes-count'
  comments: '.feed-item__reply-count'
  commentLink: '.feed-item__reply-count'
  domain: '.feed-item__url-domain'
  ignore: &ignore  ^(ascending|outsideContext|ignore|count|name|channel|post|website)$
```

As noted above, every configuration is an object whose key is the name of the configuration.

##### Explanation Of Important Fields

- `website:` The link to the page to be crawled.
- `post:` The Selector for the posts on the page
- `link:` Selector for the post's link
- ` title:` Selector for the post's title
- ` points:` Selector for the post's points or upvotes
- ` comments:` Selector for the post's comments count
- `commentLink:` Selector for the post's comment link
- `domain:` Selector for the post's domain's name
- `ignore:` Regular expression of fields to not include in the email
- `ascending:` Boolean value for whether the posts on the page be organized sorted in the mail
- `outsideContext:` Boolean value for whether subsequent queries should be made on the post context or the page context. We use this for hacker news
- `count:` Number of posts that should be allowed in the email

#### subscribers-schema.yaml

This file provides the list of subscribers and how each email should be structured.

##### Example I Content Of The File:

```
-
  email: janedoe@gmail.com
  mails:
    -
      cron: '* 1 * * *'
      name: Daily Digest
      list:
        -
          base: indiehackers
          name: 'Indie Hackers'
          count: 6
        -
          base: hackernews
          name: Hacker News
          count: 6
        -
          channel: 'unixporn'
          name: 'r/unixporn'
          base: reddit
          count: 6

```

##### Example II Content OF The File:

```
-
  email: janedoe@gmail.com
  mails:
    -
    cron: '* 1 * * *'
    name: Billboard Hot 100
    list:
      -
        name: Billboard 100
        base: billboard-100
        structure:
          top:
            name: Top Songs
            sort: points
            ascending: true
            count: 6

          new:
            name: Debut Songs
            property: isNew # property we'll use to filter
            value: ^(?!0) #anything not 0
            ascending: true
            count: 60 # i need all them new songs
```

###### In Plain English English

[Example I](#example-i-content-of-the-file) has three sections with no sub-sections while [Example II](#example-ii-content-of-the-file) contains 1 section with two sub-sections.

##### Explanation Of Important Fields

- `email:` The recipient's email
- `mails:` List of mails for this recipient

  - `cron:` A cron time format for when the mail should be sent
  - `name:` The name and subject of the mail
  - `list:` A list of sections configurations for the mail

    - `base:` The name of the configuration to use in crawling data
    - `count:` The number of posts needed in this section
    - `name:` The name of this section
    - `channel:` The channel for a Reddit based section
    - `sort:` The property to sort the posts by. Default is `points`
    - `ascending:` Boolean value signifying how the posts should be sorted, ascending or not? Default `false`
    - `property:` When set, Paisley will try to filter all posts by this property
    - `value:` When set, all the posts whose `property` value's value do not match this value will be removed. This property goes hand-in-hand with the `property` property
    - `structure:` A list of sub-section configurations on how to split the section data. Each entry is an object of section configurations whose key is the name of the sub-section. Every configuration in the section configuration is valid here except `structure` and `base`.

    > **Note** when you provide the structure field, it takes precedence. Paisley takes this as the configuration and will section the data as many times as there are elements in the structure array.

    > **Note** You should only provide base property in sections and not the sub-sections.

## FAQ

#### How Can Do Use Gmail?

If Gmail is your SMTP server of choice, use the following config:

```
USERNAME=your Gmail e.g., janedoe@gmail.com
PASSWORD=Your Gmail password
HOST=smtp.gmail.com
PORT=587
```

Even after using this configuration, Gmail will not allow you to send mails. To fix this, you will need to Turn on 'less secure app access' settings in your Gmail settings.
Navigate to https://myaccount.google.com > click on `Settings` on the sidebar > turn on `Less secure app access`

## License

(The MIT License)

Copyright (c) 2020 uduakabaci udofe &lt;uduakabaciudofe@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
