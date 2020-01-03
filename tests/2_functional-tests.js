/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var expect = chai.expect;
var server = require('../server');
var assert = chai.assert;
var collection = server.db;
chai.use(chaiHttp);

suite('Functional Tests', function() {
  let threadId;
  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST', function() {
      test('post method',(done) =>{
        let formdata = {text: 'functional test', delete_password: '123456'};
        collection.deleteOne(formdata,(err) =>{
        if(!err){
        chai.request(server)
            .post('/api/threads/test') //stupid! did not put '/'before 'api'
            .type('form')
            .send(formdata)
            .redirects(0)// prevent res redirect
            .end((err, res) =>{
          // console.log(res)
          expect(res).to.redirectTo('/b/test');
          collection.findOne(formdata,(err, doc) => {
            threadId = doc._id;
            assert.ok(doc);
            done();
          })
        })          
        }
          else {done(err)}
      })

      })
    });
    
    suite('GET', function() {
      test('get method',(done) => {
        chai.request(server)
            .get('/api/threads/t')
            .end((err, res) =>{
          let body = res.body;
          // console.log(body)
          let sampleReplies = [];
          let replyLength = body.reduce((acc, cur, idx, src) => {
            if(cur.replies.length > acc){
              acc = cur.replies.length;
              sampleReplies = cur.replies;
            }
            return acc;
          },0);
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          assert.isArray(body, 'is array');
          assert.isObject(body[0]);
          assert.property(body[0],'board');
          assert.property(body[0], 'replycount');
          assert.notProperty(body[0],'reported');
          assert.notProperty(body[0], 'delete_message')
          assert.isBelow(body.length,11);
          assert.isArray(body[0].replies);
          assert.isBelow(replyLength, 4);
          if(sampleReplies.length){
            assert.property(sampleReplies[0],'text');
            assert.notProperty(sampleReplies[0], 'delete_password');
            assert.notProperty(sampleReplies[0], 'reported')
          }
          
          done();
        })
      })
    });
    
    suite('DELETE', function() {
      test('delete method',(done) =>{
        let sampledoc = {
                          board: "testdelete",
                          text: 'functional test',
                          created_on: null,
                          bumped_on: null,
                          replies: [],
                          reported: false,
                        }
			collection.findOneAndUpdate({board:'testdelete'}, sampledoc, {upsert: true, returnNewDocument: true},(err, response) =>{
        if(!err){
          // console.log(response)
          let id = (response.lastErrorObject.upserted|| response.value._id).toString();
          chai.request(server)
           .delete('/api/threads/test')
           .type('form')
           .send({thread_id: id})
           .end((err, res) =>{
            assert.equal(res.text, 'success')
            done();
          })         
        }
        else {
          done(err);
        }
      })
    })
  })
    
    suite('PUT', function() {
      test('put method',(done) =>{
        chai.request(server)
        .put('/api/threads/test')
        .type('form')
        .send({thread_id: threadId.toString()})
        .end((err, res) =>{
          if(!err){
           assert.equal(res.text, 'reported');
          collection.findOne({_id: threadId},(err, doc) =>{
            assert.equal(doc.reported, true);
            done();
          })
          }
          else {
            done(err);
          }
        })
      })
      
    });
    

  });
  
  suite('API ROUTING FOR /api/replies/:board', function() {
    let thread_id;
    let reply_id;
    
     test('post method',(done1) =>{
       let docSample = {board: 'postreplytest', 
              text: 'try testing', 
              delete_password:'123456',
              created_on: null,
              bumped_on: null,
              replies: [],
              reported: false,
             };

        collection.findOneAndUpdate({board: 'postreplytest'}, docSample, {upsert: true, returnNewDocument: true}, (err, response) =>{
          // console.log(response);
        let threadId = (response.lastErrorObject.upserted|| response.value._id).toString();

          let formdata = {thread_id: threadId, text: 'test post reply', delete_password: '123456'};
          chai.request(server)
            .post('/api/replies/test')
            .type('form')
            .send(formdata)
            .redirects(0)
            .end((err, res) =>{
                  expect(res).to.redirectTo(`/b/${docSample.board}/${threadId}`);
                  collection.findOne({board: 'postreplytest'}, (err,doc) =>{
                    // console.log(doc);
                    thread_id = doc._id.toString();
                    reply_id = doc.replies[0]._id.toString();
                    assert.equal(doc.replies[0].text, 'test post reply');
                    if(!err){
                      done1();
                    }
                    else {
                      done1(err)
                    }
                })
              })
            });
        })
      test('get method', function(done2) {
         chai.request(server)
         .get(`/api/replies/test`)
         .query({thread_id: thread_id})
         .end((err, res) =>{
           let body = res.body;
           assert.isArray(body);
           assert.notProperty(body[0], 'reported');
           assert.notProperty(body[0], 'delete_password');
           assert.property(body[0], 'text')
           if(!err){
             done2()
           }
           else {
             done2(err)
           }
         })      
      });  

    
    test('put method', function(done3) {
      chai.request(server)
      .put('/api/replies/test')
      .type('form')
      .send({reply_id})
      .end((err, res) =>{
        assert.equal(res.text, 'reported');
        collection.findOne({board: 'postreplytest'},(err, doc) =>{
        assert.equal(doc.replies[0].reported, true);
        done3()
      })
      })
    });
    
    test('delete method', function(done4) {
      
      chai.request(server)
      .delete('/api/replies/test/')
      .type('form')
      .send({reply_id: reply_id, delete_password: '123456'})
      .end((err, res) =>{
      assert.equal(res.text, 'deleted');
      collection.findOne({board: 'postreplytest'}, (err, doc) =>{
      assert.equal(doc.replies[0].text, '[deleted]')
      done4()
      })
      })
    });
  });
});