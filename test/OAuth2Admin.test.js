"use strict"

/**
 * 测试管理员帐号的授权
 */

describe("管理员授权体系-数据库层", function(){


  it("管理员的Email为必填", function(done){

  });

  it("管理员的Email为唯一", function(done){

  });

  it("管理员的手机号码为唯一", function(done){

  });

  it("管理员的手机号码为空时，帐号的安全等级字段值为‘低’", function(done){

  });

  it("管理员所属的帐号为空时，workingStatus(工作状态)为 'unbind' ('未绑定' 表示管理员未绑定企业帐号)", function(done){

  });

  it("管理员所属的帐号必须是有效存在的帐号", function(done){

  });

  it("管理员所属的帐号为有效存在的帐号时，workingStatus(工作状态)为 'active' ('生效' 表示管理员已绑定企业帐号)", function(done){

  });

/*
  it("", function(done){

  })
  */
})

describe("管理员授权体系-WEB API层", function(){
  it("只有通过授权的Client才可以注册新的管理员", function(done){

  })

  it("注册但是并未通过验证的管理员，登录时提示需要验证", function(done){
    
  })
})
