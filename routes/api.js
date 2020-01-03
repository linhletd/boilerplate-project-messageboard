/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb').MongoClient;
var controllers = require('../controllers/routeshandle.js');
// function connectDB(app){
//   return new Promise((reject, resolve) =>{
//   MongoClient.connect(process.env.DB, (err, client) =>{
//     if(err){
//       reject(err);
//     }
//     console.log('mongo connected');
//     let threadsCollection = client.db('testdb').collection('threads');
//     // threadsCollection.remove({board: null})
//     let callbacks = controllers(threadsCollection);
//     app.route('/api/threads/:board')
//     .post(callbacks.createThread)
//     .put(callbacks.reportThread)
//     .delete(callbacks.deleteThread)
//     .get(callbacks.getRecentThreads);

//     app.route('/api/replies/:board')
//     .post(callbacks.reply)
//     .put(callbacks.reportReply)
//     .delete(callbacks.deleteReply)
//     .get(callbacks.getAllThreads);

//     app.db = threadsCollection; // for testing
//     resolve(threadsCollection);
    
//   });
//   })
// }
module.exports = function (app) {
MongoClient.connect(process.env.DB, (err, client) =>{
  console.log('mongo connected');
  let threadsCollection = client.db('testdb').collection('threads');
  // threadsCollection.remove({board: null})
  let callbacks = controllers(threadsCollection);
  app.route('/api/threads/:board')
  .post(callbacks.createThread)
  .put(callbacks.reportThread)
  .delete(callbacks.deleteThread)
  .get(callbacks.getRecentThreads);
    
  app.route('/api/replies/:board')
  .post(callbacks.reply)
  .put(callbacks.reportReply)
  .delete(callbacks.deleteReply)
  .get(callbacks.getAllThreads);
  
  app.db = threadsCollection; // for testing
  });
}