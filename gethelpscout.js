"use strict";
const moment = require("moment");
const fs = require('fs');
const axios = require("axios");
//settings.js file with username, password, pages to get, and mailbox id to use
const settings = require('./settings.js');

console.log(settings);
const {username, password, pagesToGet, mailboxId, outputJson, outputCsv} = settings;

const fullUrl = `https://${username}:${password}@api.helpscout.net/v1/mailboxes/${mailboxId}/conversations.json`;


let spamCount = 0; //count number of spam tickets
let ticketCount = 0;
let tickets = [];
let writeData = "";

//columns for CSV
writeData = "email, open time, close time, minutes\n";


//retrieve data from helpscout api
function getData(pageId) {
  let thisUrl = fullUrl + `?page=${pageId}`;
  return axios.get(
    thisUrl,
  );
}

//writes data to file
function writeToFile(outputData,fileName){
  fs.appendFile(fileName, outputData, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("Saved data to: "+ fileName);
  });  
}
 
(async function run() {
  try {
    for (let j = 1; j <= pagesToGet; j++) {
      console.log(`Getting page ${j}`)
      const results = await getData(j);

      //ticket data from api request
      let thisBatch = results.data.items;
      console.log(`items: ${thisBatch.length}`);
      
      for (let i = 0; i < thisBatch.length; i++) {
        let thisTicket = thisBatch[i];
        let email = thisTicket.createdBy.email;
        let createdAt = thisTicket.createdAt;
        let closedAt = thisTicket.closedAt;
        let openTime = moment(createdAt).format("M/D/YYYY H:mm");
        let closeTime = moment(closedAt).format("M/D/YYYY H:mm");
        let elapsedTime = Math.round((moment(closedAt)-moment(createdAt))/60000);
 
        if (!thisTicket.spam) {
          tickets.push({email:email, opentime:openTime, closetime:closeTime, elapsedtime:elapsedTime})
          writeData += email + "," + openTime + "," + closeTime + "," + elapsedTime + "\n";
          ticketCount++;
        } else {
          spamCount++;
        }      
      }
    }
 
    //console.log(tickets);
    if (outputJson){
      let jsonFileName = "helpscout-" + moment().format("YYYYMMDDHmmss") + ".json";
      let jsonWriteData = JSON.stringify(tickets,undefined,4);
      writeToFile(jsonWriteData,jsonFileName);
    }

    if (outputCsv){
      let csvFileName = "helpscout-" + moment().format("YYYYMMDDHmmss") + ".csv";
      writeToFile(writeData,csvFileName);
    }

    console.log(`Tickets: ${ticketCount} | Spam: ${spamCount}`);

  } catch (e) {
    console.log(e);
  }
})(); // self invoking function