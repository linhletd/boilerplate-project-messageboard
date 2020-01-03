var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
function convertObjectId(str, res){
  try {
    let id = ObjectId(str);
    return id;
  }
  catch(e){
    res.send("invalid objectid string!");
  }
}
  module.exports = (threadsCollection) =>({
                  createThread: function(req, res){
                    let board = req.params.board || req.body.board;
                    threadsCollection.insertOne({
                      board: board,
                      text: req.body.text,
                      delete_password: req.body.delete_password,
                      created_on: new Date().toUTCString(),
                      bumped_on: new Date().toUTCString(),
                      replies: [],
                      reported: false
                    }, (err, cursor) =>{
                      res.redirect("/b/"+board);
                    })
                  },
                  reply: function(req, res){
                    let id = convertObjectId(req.body.thread_id, res);
                    threadsCollection.findOne({_id: id},(err, thread) => {
                      if(thread){
                        
                        let newReply = {
                          _id: ObjectId(),
                          thread_id: id,
                          text: req.body.text,
                          created_on: new Date().toUTCString(),
                          delete_password: req.body.delete_password,
                          reported: false
                        };
                        thread.bumped_on = newReply.created_on;
                        thread.replies.push(newReply);
                        threadsCollection.save(thread,{},(err, cursor) =>{
                          res.redirect("/b/"+thread.board+'/'+req.body.thread_id)
                        })
                        
                      }
                      else {
                        res.send("the thead is not found!")
                      }
                    })

                  },
                  reportThread: function(req, res){
                    let id = convertObjectId(req.body.thread_id || req.body.report_id, res);
                    threadsCollection.findOneAndUpdate({_id: id}, {$set: {reported: true}}, {
                      upsert: false,
                      returnNewDocument: true
                    },(err, docArr) =>{
                      res.send('reported');
                    })
                  },
                  reportReply: function(req, res){
                    let id = convertObjectId(req.body.reply_id, res);
                    threadsCollection.findOne({replies:{$elemMatch:{_id: id}}},(err, thread) =>{
                      // console.log(thread);
                      //single query condition, $elemMatch is not better than {replies._id...}
                      let arr = thread.replies;
                      let index;
                      // console.log(arr.length)
                      for(let i = 0; i < arr.length; i++){
                        if(arr[i]._id.equals(id)){
                          index = i;
                          break;
                        }
                      }
                      thread.replies[index].reported = true;
                      threadsCollection.save(thread, {}, (err, doc) =>{
                        res.send('reported');
                      })
                      
                    })

                  },
                  deleteThread: function(req, res){
                    let id = convertObjectId(req.body.thread_id, res);
                    threadsCollection.findOne({_id: id},(err, thread) =>{
                      if(thread){
                        if(thread.delete_password === req.body.delete_password){
                          threadsCollection.deleteOne({_id: id}, (err, cursor1) =>{
                            // repliesCollection.deleteMany({thread_id: id}, (err, cursor2) =>{
                              res.send('success');
                            // })
                          })
                        }
                        else{
                          res.send('incorrect password');
                        }
                      }
                      else{
                        res.send('thread is not found')
                      }
                    })
                  },
                  deleteReply: function(req, res){
                    let id = convertObjectId(req.body.reply_id, res);
                    threadsCollection.findOne({"replies._id": id},(err, thread) =>{
                      //single query condition, $elemMatch is not better than {"replies._id"...}
                      if(thread){
                        let arr = thread.replies;
                        let index;
                        for(let i = 0; i < arr.length; i++){
                          if(arr[i]._id.equals(id)){
                            index = i;
                            break;
                          }
                        }
                        if(thread.replies[index].delete_password === req.body.delete_password){
                          thread.replies[index].text = '[deleted]';
                          threadsCollection.save(thread, {}, (err, doc) =>{
                            res.send('deleted');
                          })
                        }
                        else{
                          res.send('incorrect password');
                        }

                      }
                      else{
                        res.send('reply is not found');
                      }
                    })
                    
                  },
                  getRecentThreads: function(req, res){
                    // console.log('user want to get some data');
                    threadsCollection.aggregate([
                      {$match: {}},
                      {$sort: {bumped_on: -1}},
                      {$limit: 10},
                      {$sort: {"replies.created_on": -1}},
                      {$project: {
                        board: 1,
                        text: 1,
                        created_on: 1,
                        bumped_on: 1,
                        // "replies.delete_password": 0,
                        // "replies.reported": 0,
                        replies: 1,
                        replycount:{$size: "$replies"},
                        replies: {$slice:["$replies", 0,3]}
                      }},
                      {$project:{
                        "replies.delete_password": 0,
                        "replies.reported": 0
                      }}
                    ],(err, docs) =>{
                      res.json(docs);
                    })
                  },
                  getAllThreads: function(req, res){
                    let id = convertObjectId(req.query.thread_id, res);
                    threadsCollection.findOne({_id: id},{
                      // reported: 0,
                      // delete_password: 0,
                      "replies.reported": 0,
                      "replies.delete_password": 0
                    },(err, doc) =>{
                      res.json(doc.replies);
                    })
                  }
                 })
// })
