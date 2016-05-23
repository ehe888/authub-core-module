"use strict"

let request = require('supertest')
  , cookieParser 	= require('cookie-parser')
  , bodyParser = require("body-parser")
  , express = require('express')
  , should  = require('chai').should
  , expect  = require('chai').expect
  , app     = express()
  , shortid = require('shortid')
  , randomstring 	= require("randomstring")
  , jwt = require("jsonwebtoken");

/**
 * Clean up databases
 */
let DatabaseCleaner = require('database-cleaner');
let databaseCleaner = new DatabaseCleaner("mongodb");
let connect = require('mongodb').connect;
var dbHost = process.env.MONGO_HOST || 'localhost';



let accountName = "aivics";
let clientId = "";
let clientSecret = "";

app.use(cookieParser());
app.use(bodyParser());

let identity = express();
app.use("/identity", identity);

require("../lib")(identity, {
  mongodb: { db: "authub_master" }
});

let jwtToken;
let jwtATSecret;
let jwtAlgorithm;

var dbOptions = {
    server: "mongodb://localhost/",
    masterDb: "authub_master"
}

let dbs = require('../lib/models')(dbOptions);


var masterAccount;
var masterClient = {
  secret: randomstring.generate(32)
}

describe("OAuth2 core", function(){
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

  /**
   * 系统初始化时需要执行的一次性操作, 系统初始化后有一个 MasterDB，一个MasterClient
   * MasterClient可以进行后续的注册帐号等操作
   */
  it("成功创建Master Account", function(done){
    dbs.connectToMaster(function(err, db){
      return db.model("Account").create({
        name: dbOptions.masterDb,
        username: 'admin',
        password: 'abc123456',
        mobile: '13764211365',
        email: 'lei.he@fastccm.com',
        fullname: "上海希希麦科技有限公司",
        lastName: "何",
        accessToken: {
          secret: randomstring.generate(32)
        },
        refreshToken: {
          secret: randomstring.generate(64)
        }
      })
      .then(function(account){
        expect(account).to.exist;
        expect(account.name).to.equal(dbOptions.masterDb);
        masterAccount = account;
        done();
      })
      .catch(function(err){
        console.error(err);
        return done(err);
      })
    })
  })

  it("不能重复创建Master Account，名称必须唯一", function(done){
    dbs.connectToMaster(function(err, db){
      return db.model("Account").create({
        name: dbOptions.masterDb,
        username: 'admin',
        password: 'abc123456',
        mobile: '13764211365',
        email: 'lei.he@fastccm.com',
        fullname: "上海希希麦科技有限公司",
        lastName: "何",
        accessToken: {
          secret: randomstring.generate(32)
        },
        refreshToken: {
          secret: randomstring.generate(64)
        }
      })
      .then(function(account){

      })
      .catch(function(err){
        console.error(err);
        expect(err).to.exist;
        done();
      })
    })
  })

  it("成功创建一个Master Client", function(done){
    dbs.connectToMaster(function(err, db){
      return db.model("Client").create({
        name: "MasterDB Client"
        ,secret: masterClient.secret
        ,account: masterAccount
        ,scope: [ 'register' ]
      })
      .then(function(client){
        expect(client).to.exist;
        masterClient.id = client._id
        done();
      })
      .catch(function(err){
        console.error(err);
        return done(err);
      })
    })
  })

  it("验证Master Client的ID和密码", function(done){
    dbs.connectToMaster(function(err, db){
      return db.model("Client").findOne({
        _id: masterClient.id
      })
      .then(function(client){
        return client.compareClientSecrectAsync(masterClient.secret);
      })
      .then(function(isMatch){
        expect(isMatch).to.be.true;
        done();
      })
      .catch(function(err){
        console.error(err);
        return done(err);
      })
    })
  })
});


describe("Client授权体系-WEB API层", function(){
  var jwtToken;

  it("should success to get token using client_credential granty type", function(done){
    var data = {
      client_id: masterClient.id,
      client_secret: masterClient.secret,
      grant_type: 'client_credential'
    }
    request(app)
      .post('/identity/oauth2/token')
      .set('X-Authub-Account', masterAccount.name)
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

  it("应该成功注册一个账号", function(done){
    request(app)
      .post('/identity/register')
      .set('X-Authub-Account', masterAccount.name)
      .set("Authorization", "Bearer " + jwtToken.access_token )
      .send({
          name: "aivics",
          fullname: "猎户座网络科技有限公司",
          username: 'aivics_admin',
          password: 'abc123456',
          mobile: '18621661799',
          email: 'lei.he@aivics.com',
          lastName: 'HE',
          firstName: 'LEI'
      })
      .expect(201)
      .expect(function(res){
        if( res.body.success !== true ) return "request_failed";
        if( res.body.name !== "aivics" ) return "incorrect_account_name";
      })
      .end(done);
  })

  var veri_code;
  var vericode_token;


  it("成功获得Verification Code", function(done){
    var data = { identity: 'lei.he@aivics.com' , veri_type: 'email', target_url: "/accounts/activate" };
    request(app)
      .post('/identity/vericode/code')
      .send( data )
      .expect(201)
      .expect(function(res){
        veri_code = res.body.veri_code;
        console.log("code: ", veri_code);
        if( res.body.success !== true ) throw new Error('invalid_response');
        if( process.env.NODE_ENV === 'development' && !res.body.veri_code ) throw new Error('invalid_code_returned');
      })
      .end(done);
  });

  it('通过CODE成功换取TOKEN', function(done){
    var data = { identity: 'lei.he@aivics.com', veri_code: veri_code };
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

  it("成功激活Admin Account", function(done){
    request(app)
      .get('/identity/accounts/activate')
      .set('X-Authub-Account', accountName)
      .send({ vericode_token: vericode_token })
      .expect(200)
      .end(function(err, res){
        console.error(err);

        done(err);
      });
  });

  it("应该成功通过新注册的账号的Admin用户名和密码换取AccessToken", function(done){
    request(app)
      .post('/identity/oauth2admin/token')
      .set('X-Authub-Account', "aivics")
      .send({
          username: 'aivics_admin',
          password: 'abc123456',
          grant_type: 'password'
      })
      .expect(200)
      .expect(function(res){
        expect(res.body.access_token).to.exist;
        jwtToken = res.body;
      })
      .end(done);
  })

  it("通过RefreshToken换取新的AccessToken", function(done){
    request(app)
      .post('/identity/oauth2admin/token')
      .set('X-Authub-Account', "aivics")
      .send({
        refresh_token: jwtToken.refresh_token,
        grant_type: 'refresh_token'
      })
      .expect(200)
      .expect(function(res){
        expect(res.body.access_token).to.exist;
        jwtToken = res.body;
      })
      .end(done);
  })

  it("Account名称不匹配，则不能通过RefreshToken换取新的AccessToken", function(done){
    request(app)
      .post('/identity/oauth2admin/token')
      .set('X-Authub-Account', "authub_master")
      .send({
        refresh_token: jwtToken.refresh_token,
        grant_type: 'refresh_token'
      })
      .expect(403)
      .end(done);
  })

  it("通过Admin账号可以创建新用户", function(done){
    request(app)
      .post('/identity/users')
      .set('X-Authub-Account', "aivics")
      .set("Authorization", "Bearer " + jwtToken.access_token )
      .send({
        username: 'ehe8888',
        password: '123456',
        mobile: '13764211365',
        email: 'lei.he@aivics.com',
        staff: 'S001',
        firstName: 'Lei',
        lastName: 'He'
      })
      .expect(201)
      .expect(function(res){
        expect(res.body.data.username).to.equal("ehe8888")
      })
      .end(done);
  })

  it("获得激活新用户的CODE", function(done){
    var data = { identity: 'lei.he@aivics.com' , veri_type: 'email', target_url: "/users/activate" };
    request(app)
      .post('/identity/vericode/code')
      .send( data )
      .expect(201)
      .expect(function(res){
        veri_code = res.body.veri_code;
        console.log("code: ", veri_code);
        if( res.body.success !== true ) throw new Error('invalid_response');
        if( process.env.NODE_ENV === 'development' && !res.body.veri_code ) throw new Error('invalid_code_returned');
      })
      .end(done);
  });

  it('通过CODE成功换取激活新用户的TOKEN', function(done){
    var data = { identity: 'lei.he@aivics.com', veri_code: veri_code };
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

  it("成功激活普通用户User Account", function(done){
    request(app)
      .get('/identity/users/activate')
      .set('X-Authub-Account', accountName)
      .send({ vericode_token: vericode_token })
      .expect(200)
      .end(function(err, res){
        console.error(err);
        done(err);
      });
  });

  it("通过新用户的用户名和密码可以等到用户的AccessToken", function(done){
    request(app)
      .post('/identity/oauth2/token')
      .set('X-Authub-Account', "aivics")
      .send({
          username: 'ehe8888',
          password: '123456',
          grant_type: 'password'
      })
      .expect(200)
      .expect(function(res){
        expect(res.body.access_token).to.exist;
        jwtToken = res.body;
      })
      .end(done);
  })
});



//
//
// describe("Client Handler", function(){
//   it("should success to create client when account name is valid", function(done){
//     request(app)
//       .post('/identity/clients')
//       .set('X-Authub-Account', accountName)
//       .set("Authorization", "Bearer " + jwtToken.access_token )
//       .expect(201)
//       .end(function(err, res){
//         if (err) {
//           console.log(err);
//           return done(err);
//         }
//         console.log(res.body);
//
//         clientId = res.body.data._id;
//         clientSecret = res.body.data.clientSecretClearText;
//
//         done();
//       });
//   });
//
//
//   it("should success to get new token with refresh_token granty type", function(done){
//     var data = {
//       refresh_token: jwtToken.refresh_token,
//       grant_type: 'refresh_token'
//     }
//     request(app)
//       .post('/identity/oauth2/token')
//       .set('X-Authub-Account', accountName)
//       .send(data)
//       .expect(200)
//       .end(function(err, res){
//         if (err) {
//           return done(err);
//         }
//
//         console.log(res.body);
//
//         jwtToken = res.body;
//
//         done();
//       });
//   });
// });
