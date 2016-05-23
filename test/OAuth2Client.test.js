"use strict"

describe("Client授权体系-WEB API层", function(){
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

  // it("注册但是并未通过验证的管理员，登录时提示需要验证", function(done){
  //
  // })
});
