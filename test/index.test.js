"use strict"

let request = require('supertest')
  , cookieParser 	= require('cookie-parser')
  , bodyParser = require("body-parser")
  , express = require('express')
  , should  = require('chai').should
  , expect  = require('chai').expect
  , app     = express()
  , shortid = require('shortid');

/**
 * Clean up databases
 */
let DatabaseCleaner = require('database-cleaner');
let databaseCleaner = new DatabaseCleaner("mongodb");
let connect = require('mongodb').connect;
var dbHost = process.env.MONGO_HOST || 'localhost';



let accountName = "test_account";
let clientId = "";
let clientSecret = "";

describe("Identity", function(){
  before(function(done){
    console.log("before all tests - clean up master db");

    connect('mongodb://localhost/authub_master', function(err, db) {
      databaseCleaner.clean(db, function() {
        console.log('done - clean');
        db.close();
        connect('mongodb://localhost/' + accountName, function(err, db) {
          databaseCleaner.clean(db, function() {
            console.log('done - clean');
            db.close();
            done();
          });
        });
      });
    });


  });

  app.use(cookieParser());
  app.use(bodyParser());

  let identity = express();
  app.use("/identity", identity);

  require("../lib")(identity, {

  });

  it("should create a account", function(done){
    request(app)
      .post('/identity/register')
      .send({
          name: accountName,
          username: 'admin',
          password: 'abc123456',
          mobile: '13764211365',
          email: 'lei.he@aivics.com',
          lastName: 'HE',
          firstName: 'LEI'
      })
      .expect(201)
      .expect(function(res){
        if( res.body.success !== true ) return "request_failed";
        if( res.body.data.name !== accountName ) return "incorrect_account_name";
      })
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
  });

  it("should failed when account name is invalid", function(done){
    request(app)
      .get('/identity')
      .set('X-Authub-Account', 'invalid_account')
      .expect(500)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
  });

  it("should success to create client when account name is valid", function(done){
    request(app)
      .post('/identity/clients')
      .set('X-Authub-Account', accountName)
      .expect(201)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        console.log(res.body);

        clientId = res.body.data._id;
        clientSecret = res.body.data.clientSecretClearText;

        done();
      });
  });

  it("should success to create administrator when account name is valid", function(done){
    var data = {
      username: 'ehe888',
      password: '123456',
      mobile: '13764211365',
      email: 'lei.he@aivics.com',
      firstName: 'Lei',
      lastName: 'He'
    }
    request(app)
      .post('/identity/administrators')
      .set('X-Authub-Account', accountName)
      .send(data)
      .expect(201)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
  });

  it("should success to get admin token using password granty type", function(done){
    var data = {
      username: 'ehe888',
      password: '123456',
      grant_type: 'password',
      user_type: 'admin'
    }
    request(app)
      .post('/identity/oauth2/token')
      .set('X-Authub-Account', accountName)
      .send(data)
      .expect(200)
      .end(function(err, res){
        if (err) {
          return done(err);
        }

        console.log(res.body);

        done();
      });
  });


  it("should success to create user when account name is valid", function(done){
    var data = {
      username: 'ehe888',
      password: '123456',
      mobile: '13764211365',
      email: 'lei.he@aivics.com',
      staff: 'A0001', //Staff ID submitted from business system must be unique
      firstName: 'Lei',
      lastName: 'He'
    }
    request(app)
      .post('/identity/users')
      .set('X-Authub-Account', accountName)
      .send(data)
      .expect(201)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
  });

  it("should success to get token using password granty type", function(done){
    var data = {
      username: 'ehe888',
      password: '123456',
      grant_type: 'password'
    }
    request(app)
      .post('/identity/oauth2/token')
      .set('X-Authub-Account', accountName)
      .send(data)
      .expect(200)
      .end(function(err, res){
        if (err) {
          return done(err);
        }

        console.log(res.body);

        done();
      });
  });

  it("should success to get token using client_credential granty type", function(done){
    var data = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credential'
    }
    request(app)
      .post('/identity/oauth2/token')
      .set('X-Authub-Account', accountName)
      .send(data)
      .expect(200)
      .end(function(err, res){
        if (err) {
          return done(err);
        }

        console.log(res.body);

        done();
      });
  });
});
