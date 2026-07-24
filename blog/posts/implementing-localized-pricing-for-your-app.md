---
date: "2024-08-26"
title: Implementing localized pricing for your mobile app
og_title: Implementing localized pricing for your mobile app | Liftosaur blog
og_image: /images/implementing-localized-pricing.jpg
og_description: "How to implement fair localized prices for your mobile app, taking into account the purchasing power of your users"
tags: ["tech"]
---

![Implementing localized pricing for your mobile app](../../images/implementing-localized-pricing.jpg)

**TLDR; I recently implemented localized pricing for the mobile app, which was suprisingly tricky. So, sharing my experience of fighting with Apple and Google APIs to make it work, and sharing Google Sheets and scripts to calculate and upload the prices.**

## Coming up with fair prices for various countries

I used to have flat pricing for all the users. But it's kinda unfair to charge the same amount for users from US and e.g. India or Phillipines - the purchase power is so different in those countries! In addition to that, Apple and Google try to take into account the local taxes, so sometimes the price gets even higher than in the US - e.g. if you set the price as $70, in Germany by default Apple / Google would set it to be around €80. And people were not super happy about that. 

So, I decided to do localized prices. But how to make sure I'm setting a fair price for all those 170+ countries? I have no idea what's the cost of living there for most of them.

I'd frankly expect that Apple or Google solve that, and provide adjust the prices for various countries, but they don't really do that. So, we have to do it ourselves!

To solve that, we could divice that country GDP per capita by the USA GCP per capita, and that's going to be our multiplier for the prices. It probably makes sense to cap it at the top and the bottom, so e.g. the monthly subscription price doesn't go higher than $4.99, and lower than $0.99. The top cap is because likely the most advertised price would be the US one, and people from other rich countries like Singapore or Schwitzerland would be disappointed they have to pay higher than US. And the bottom cap is to avoid super small prices like a tiny fraction of a dollar e.g. in Phillipines, where fees would eat the majority of the price.

I found some data on GDP per capita on the Internet, dumped it into a Google Sheet, and calculated the multiplier. Then, added some columns to specify the base price in USD, then the adjusted price after applying multiplier in USD. Apple and Google require for some countries to provide the prices in local currencies, so I grabbed the exchange rates and created  columns with prices in local currencies.

Then, to make the prices prettier (like a "marketing price", with all those $4.99, $19.99) - added another set of columns that would round up the prices to make them look "markety".

It's a bit annoying that Apple and Google use a different set of countries, different country codes (Google uses 2-character ones like US or NL, and Apple uses 3-character like USA or NLD), and also different currencies per country - Google more often prefers local currency, and Apple fallbacks to USD. So, I had to create 2 separate sheets for Apple and Google prices.

## My Google Sheet with prices

At the end, the sheets look like this: [https://docs.google.com/spreadsheets/d/1BwSqpkqa98nk9Gh7238U7KQbvdvh_tGlXmQKE0Druwk](https://docs.google.com/spreadsheets/d/1BwSqpkqa98nk9Gh7238U7KQbvdvh_tGlXmQKE0Druwk).

There're 2 sheets for Apple and Google prices, and 2 auxiliary sheets for GDP multiplier and currency exchange rates.
You could use that to calculate your own localized prices. Just replace the values in **"Monthly Base"**, **"Yearly Base"** and **"Lifetime Base"** with your USD prices, and maybe (if you want) adjust the caps in the formulas for **"Monthly Adj US"**, **"Yearly Adj US"** and **"Lifetime Adj US"**. By default the caps are $1-5 for montly, $8-40 for yearly, and $16-80 for lifetime.

The final prices we'll use are in the **Mkt Monthly/Yearly/Lifetime** columns - marketing prices in proper currencies.

So, we have prices for Apple and Google, now need to upload them. I expected I'd go to App Connect console or Google Play console, edit the subscription, and upload the prices as some CSV file. Ha, not that fast!

Apparently in both Apple/Google I can only edit one price for one country at a time. So, I'd need to manually enter 170 countries * 3 price plans * 2 platforms = ~1000 times! This is ridiculous. Given their UI is not blazing fast, it'd take days to do so!

Luckily, they have APIs, so we could use the APIs to upload the prices. Unfortunately, those APIs look like they were written by an unpaid intern without any supervision. They're confusing, buggy, return weird cryptic error messages, and even ChatGPT doesn't know how to use them properly.

It took me a couple days to figure out how to upload the prices, but finally I'm done, and I'm happy to share the final scripts with you. The scripts are in JavaScript, so you'd need NodeJS to run them.

## Uploading prices to Google

The API and the way how prices for subscriptions and for in-app purchases work internally is VERY different in Apple and Google.

In Google, we send ALL the prices for a subscription as one request. The API is very sensitive to the request body,
but the documentation is sparse, so it's hard to figure out what it expects. If you send something that Google doesn't expect, it just responds with generic "Internal error.", and go figure what it doesn't like.

Luckily, the response of listing all subscription info from API and the request body for updating a subscription is pretty much the same JSON, so we can use that:

* First, we get all our subscriptions info via `androidpublisher.monetization.subscriptions.list`.
* Then, in the response, we modify `subscription.basePlans.regionalConfigs.price` values.
* We use the modified response as a POST body for `androidpublisher.monetization.subscriptions.patch`.

Similar for in-app purchases:

* First, we get all our subscriptions info via `androidpublisher.inappproducts.list`.
* Then, in the response, we modify `product.prices` values.
* We use the modified response as a POST body for `androidpublisher.inappproducts.patch`.

For some reason, the number of countries supporting in-app billing is smaller that the subscription billing, so need
to filter out some countries as well.

At the end, the script looks like this: [https://gist.github.com/astashov/705c45e5f8f6c89cc5f968ba128b1800](https://gist.github.com/astashov/705c45e5f8f6c89cc5f968ba128b1800)

To run it, install `googleapis` (`npm install googleapis`), modify the script with your service account key, package name,
subscription/product ids, then make sure to download the CSV file from the sheet and name it `google_prices.csv`, and run it as `node update_google_prices.js`. Hopefully it'll work! :)

## Uploading prices to Apple

For Google, the API was a bit tricky, but at the end we could just update all prices for each subscription with just one API call, and provide the prices directly.

This is not the case at all for Apple, it would be too simple. You cannot just set the price for your subscription!
Instead, it has a list of "price points", and you should assign that price point to your subscription and territory. I.e. if Apple only has price points $0.99 and $0.79 for Afganistan, you cannot set the price e.g. $0.85. You have to use the price points.

Each country has a few hundreds of price points, and each price point has an id. To know the ids, you need to fetch the price points for each territory from their API. The API seems to have some rate limit, and also pagination with the page size limit, so make sure to not do it in parallel, and need to sometimes retry it too when it fails. Seems like sweet spot is to run 2-3 requests in parallel.
Then, you probably want to cache all those price points and their ids on disk to avoid slow repeated network calls when you restart the script.

After you download all the price points, you need to find the closest price point to a price from the spreadsheet/CSV file, get id of that price point, and update the subscription and territory with that price point id. You can only update one price point per subscription and territory, but for some reason you can do it in bulk for in-app purchases and send all price points for all territories for an in-app purchase in one request.

So, that's how it basically works:

* Fetch all the price points for the territories
* Find closest price point
* Update that price point for the subscription / territory

And similarly for in-app purchases.

The script looks like this: [https://gist.github.com/astashov/79dd4ef4e91ea012710145623bfe0984](https://gist.github.com/astashov/79dd4ef4e91ea012710145623bfe0984)

To run it, install `jsonwebtoken` and `node-fetch` (`npm install jsonwebtoken node-fetch`), modify the script with your keys, app id, subscription/product ids, etc, then make sure to download the CSV file from the sheet and name it `apple_prices.csv`, and run it as `node update_apple_prices.js`.

## Changing the prices

After all of that, updating the prices for your app becomes a pretty trivial routine:

* Open the spreadsheet, and update the monthly/yearly/lifetime prices in the **Base** columns.
* Export the updated spreadsheets into `google_prices.csv` and `apple_prices.csv`
* Run `node update_apple_prices.js` and `node update_google_prices.js`

And that's it!