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
// MongoClient.connect(process.env.DB, (err, client) =>{
//   let threadsCollection = client.db('testdb').collection('threads');
  module.exports = (threadsCollection) =>({
                  createThread: function(req, res){
                    req.params.board = req.body.board
                    threadsCollection.insertOne({
                      board: req.body.board,
                      text: req.body.text,
                      delete_password: req.body.delete_password,
                      created_on: new Date().toUTCString(),
                      bumped_on: new Date().toUTCString(),
                      replies: [],
                      reported: false
                    }, (err, cursor) =>{
                      res.redirect("/b/"+req.body.board);
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
                          res.redirect("/b/"+thread.board)
                        })
                        
//                         repliesCollection.insertOne({
//                           _id: ObjectId(),
//                           thread_id: id,
//                           text: req.body.text,
//                           created_on: new Date().toUTCString(),
//                           delete_password: req.body.delete_password,
//                           reported: false

//                         }).toArray((err, replyArr)=>{
//                           thread.bumped_on = replyArr[0].created_on;
//                           threadsCollection.save(thread,(err, cursor) =>{
//                             res.redirect("/b/"+thread.board)
//                           })
//                         })                        
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
                      console.log(docArr);
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
                      console.log(arr.length)
                      for(let i = 0; i < arr.length; i++){
                        // console.log(arr[i]._id.equals(id))
                        if(arr[i]._id.equals(id)){
                          index = i;
                          break;
                        }
                      }
                      thread.replies[index].reported = true;
                      // console.log(index);
                      threadsCollection.save(thread, {}, (err, doc) =>{
                        res.send('reported');
                      })
                      
                    })
                    // repliesCollection.findOneAndUpdate({_id: id}, {reported: true}, {
                    //   upsert: false,
                    //   returnNewDocument: true
                    // },(err, cursor) =>{
                    //   res.send('reported');
                    // })
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
                    console.log(req.body);
                    threadsCollection.findOne({"replies._id": id},(err, thread) =>{
                      //single query condition, $elemMatch is not better than {"replies._id"...}
                      // console.log(thread)
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
                    // repliesCollection.findOneAndUpdate({_id: id}, {reported: true}, {
                    //   upsert: false,
                    //   returnNewDocument: true
                    // },(err, cursor) =>{
                    //   res.send('reported');
                    // })
                  },
                  getRecentThreads: function(req, res){
                    console.log('user want to get some data');
                    threadsCollection.aggregate([
                      {$match: {}},
                      {$sort: {bumped_on: -1}},
                      {$limit: 10},
                      {$sort: {"replies.created_on": -1}},
                      {$project: {
                        reported: 1,
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
                    threadsCollection.find({},{
                      reported: 0,
                      delete_password: 0,
                      "replies.reported": 0,
                      "replies.delete_password": 0
                    }).toArray((err, docs) =>{
                      res.json(docs);
                    })
                  }
                 })
// })
