"use strict"


let mongoose 	= require('mongoose');
let Schema 		= mongoose.Schema;

let _ 						= require("lodash")
	, bcrypt	 			= require('bcrypt-as-promised') //A promise version of bcrypt
	, randomstring 	= require("randomstring")
	, debug					= require('debug')('authub')
	, Promise 			= require('bluebird');

//-- Delcare Variables --//
var SALT_WORK_FACTOR 	= 10;

let VeriCodeSchema = new Schema({
	identity: { type: String, require: true },
	veriCode: { type: String, require: true },
	used: { type: Boolean, require: true, default: false },
  targetUrl: { type: String, require: true },
  expiresAt: { type: Date, default: Date.now },
	createdAt : { type: Date, default: Date.now },
	updatedAt : { type: Date },
	deletedAt : { type: Date }
});



VeriCodeSchema.statics.generate = function(identity, expires, targetUrl, done){
  var veri_code = randomstring.generate({
    length: 4,
    charset: '1234567890'
  });

	return this.create({
    identity: identity,
    expiresAt: _.now() + expires * 1000,
    targetUrl: targetUrl,
    veriCode: veri_code
  })
  .then(function(instance){
    console.log(instance);

    if(!instance){
      return done(new Error("failed_to_create_code"))
    }
    return done(null, instance.veriCode);
  })
  .catch(function(err){
    console.error(err);
    return done(err);
  });
};


VeriCodeSchema.statics.validate = function(identity, code, done){
	var client = this;;
  this.findOne({
    identity: identity,
    veriCode: code,
    used: false
  })
  .then(function(instance){
    if(!instance){
      return done(new Error("invalide_code_and_identity"));
    }
    return done(null, randomstring.generate(32), instance.targetUrl);
  })
  .catch(function(err){
    console.error(err);

    return done(err);
  })
}


module.exports = mongoose.model('VeriCode', VeriCodeSchema);
