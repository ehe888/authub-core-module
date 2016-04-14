"use strict"

let request = require('supertest')
  , cookieParser 	= require('cookie-parser')
  , bodyParser = require("body-parser")
  , express = require('express')
  , should  = require('chai').should
  , expect  = require('chai').expect
  , app     = express()
  , shortid = require('shortid')
  , jwt = require("jsonwebtoken");

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

describe("OAuth2 Identity Service", function(){
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

  let jwtToken;
  let jwtATSecret;
  let jwtAlgorithm;

  it("should create an account and its owner administrator", function(done){
    request(app)
      .post('/identity/register')
      .send({
          name: accountName,
          username: 'admin',
          password: 'abc123456',
          mobile: '18912326036',
          email: 'lei.he@fastccm.com',
          lastName: 'HE',
          firstName: 'LEI'
      })
      .expect(201)
      .expect(function(res){
        if( res.body.success !== true ) return "request_failed";
        if( res.body.data.name !== accountName ) return "incorrect_account_name";
        jwtATSecret = res.body.data.accessToken.secret;
        jwtAlgorithm = res.body.data.accessToken.algorithm;

      })
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
  });

  it("should get 500 error if account name is invalid", function(done){
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

  it("should failed to get administrator token using password granty type when user is not activated!", function(done){
    var data = {
      username: 'admin',
      password: 'abc123456',
      grant_type: 'password',
      user_type: 'admin'
    }
    request(app)
      .post('/identity/oauth2/token')
      .set('X-Authub-Account', accountName)
      .send(data)
      .expect(403)
      .end(function(err, res){
        if (err) {
          return done(err);
        }

        console.log(res.body);

        //jwtToken = res.body;

        done();
      });
  });

  it("should failed to activate administrator without vericode_token", function(done){
    request(app)
      .get('/identity/administrators/activate')
      .set('X-Authub-Account', accountName)
      .expect(403)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        console.log(res.body);
        done();
      });
  });

  process.env.NODE_ENV = 'local-unit-test';
  var code;
  var vericode_token;
  var data = { identity: 'lei.he@fastccm.com' , veri_type: 'email', target_url: "/administrators/activate" };

  it("should success to get veri code", function(done){
    request(app)
      .post('/identity/vericode/code')
      .send( data )
      .expect(201)
      .expect(function(res){

        code = res.body.veri_code;
        console.log("code: ", code);

        if( res.body.success !== true ) throw new Error('invalid_response');
        if( process.env.NODE_ENV === 'local-unit-test' && !res.body.veri_code ) throw new Error('invalid_code_returned');
      })
      .end(done);
  });

  it('should return token', function(done){

    console.log(identity + " & " + code);

    var data = { identity: 'lei.he@fastccm.com', veri_code: code };
    request(app)
      .post('/identity/vericode/validate')
      .send( data )
      .expect(201)
      .end(function(err, res){
        if (err) return done(err);
        vericode_token = res.body.vericode_token;
        console.log(vericode_token);
        done();
      });
  });

  it("should success to activate administrator with vericode_token", function(done){
    request(app)
      .get('/identity/administrators/activate')
      .set('X-Authub-Account', accountName)
      .send({ vericode_token: vericode_token })
      .expect(200, { success: true })
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        console.log(res.body);
        done();
      });
  });


  it("should success to get administrator token using password grant type when user is activated!", function(done){
    var data = {
      username: 'admin',
      password: 'abc123456',
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

        jwtToken = res.body;

        done();
      });
  });

  it("should contain expires_in field in access_token", function(done){
    var token = jwt.verify(jwtToken.access_token, jwtATSecret, { algorithms: [ jwtAlgorithm ] });
    expect(token.exp).to.be.a('Number');
    done();
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
      .set("Authorization", "Bearer " + jwtToken.access_token )
      .send(data)
      .expect(201)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
  });

  it("should failed to create administrator when username is duplicated", function(done){
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
      .set("Authorization", "Bearer " + jwtToken.access_token )
      .send(data)
      .expect(500)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
  });

  it("should failed to create administrator when email is duplicated", function(done){
    var data = {
      username: 'ehe8888',
      password: '123456',
      mobile: '137642113658',
      email: 'lei.he@aivics.com',
      firstName: 'Lei',
      lastName: 'He'
    }
    request(app)
      .post('/identity/administrators')
      .set('X-Authub-Account', accountName)
      .set("Authorization", "Bearer " + jwtToken.access_token )
      .send(data)
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
      .set("Authorization", "Bearer " + jwtToken.access_token )
      .expect(201)
      .end(function(err, res){
        if (err) {
          console.log(err);
          return done(err);
        }
        console.log(res.body);

        clientId = res.body.data._id;
        clientSecret = res.body.data.clientSecretClearText;

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
        jwtToken = res.body;

        done();
      });
  });

  it("should success to create user use client token when account name is valid", function(done){
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
      .set("Authorization", "Bearer " + jwtToken.access_token )
      .send(data)
      .expect(201)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
  });
});


describe("user creation and activation", function(){
  let jwtToken;
  let jwtATSecret;
  let jwtAlgorithm;



  it("should failed to get token using password granty type when not activated", function(done){
    var data = {
      username: 'ehe888',
      password: '123456',
      grant_type: 'password'
    }
    request(app)
      .post('/identity/oauth2/token')
      .set('X-Authub-Account', accountName)
      .send(data)
      .expect(403)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
  });

  process.env.NODE_ENV = 'local-unit-test';
  var code;
  var vericode_token;
  var data = { identity: '13764211365' , veri_type: 'mobile', target_url: "/users/activate" };

  it("should success to get veri code", function(done){
    request(app)
      .post('/identity/vericode/code')
      .send( data )
      .expect(201)
      .expect(function(res){

        code = res.body.veri_code;
        console.log("code: ", code);

        if( res.body.success !== true ) throw new Error('invalid_response');
        if( process.env.NODE_ENV === 'local-unit-test' && !res.body.veri_code ) throw new Error('invalid_code_returned');
      })
      .end(done);
  });

  it('should return vericode token', function(done){
    var data = { identity: '13764211365', veri_code: code };
    request(app)
      .post('/identity/vericode/validate')
      .send( data )
      .expect(201)
      .end(function(err, res){
        if (err) return done(err);
        vericode_token = res.body.vericode_token;
        console.log(vericode_token);
        done();
      });
  });

  it("should success to activate user with vericode_token", function(done){
    request(app)
      .get('/identity/users/activate')
      .set('X-Authub-Account', accountName)
      .send({ vericode_token: vericode_token })
      .expect(200, { success: true })
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        console.log(res.body);
        done();
      });
  });

  // it("should success to get token using password granty type when activated", function(done){
  //   var data = {
  //     username: 'ehe888',
  //     password: '123456',
  //     grant_type: 'password'
  //   }
  //   request(app)
  //     .post('/identity/oauth2/token')
  //     .set('X-Authub-Account', accountName)
  //     .send(data)
  //     .expect(200)
  //     .end(function(err, res){
  //       if (err) {
  //         return done(err);
  //       }
  //
  //       console.log(res.body);
  //
  //       done();
  //     });
  // });
})
