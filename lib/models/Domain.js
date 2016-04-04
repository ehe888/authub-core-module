"use strict"

let mongoose 	= require('mongoose');
let Schema 		= mongoose.Schema;

let DomainSchema = new Schema({
	name: { type: String, lowercase: true, trim: true, index: { unique: true }, require: true },
  account: { type: Schema.Types.ObjectId, required: true, ref: 'Account' },
	clients: [{ type: Schema.Types.ObjectId, required: true, ref: 'Client' }],
  cookie: {
    maxAge: { type: Number, default: 7200 }
    ,secure: { type: Boolean, default: false }
    ,cipher: { type: String, default: 'aes-256-cbc' }
    ,encoding: { type: String, default: 'base64' }
    ,httpOnly: { type: Boolean, default: false }
    ,signed: { type: Boolean, default: true }
  },
  jwt: {
    expiresIn: { type: Number, default: 24 * 60 * 60 } /* jwt token expires in seconds */
    ,secret: { type: String, default: '==>thisisasecuredtoken<==' }
    ,privateKey: { type: String }
    ,publicKey: { type: String }
  },
	qywx: {
		corpId: { type: String }
		,corpSecret: { type: String }
	},
	wechat: {
		appId: { type: String }
		,appSecret: { type: String }
	},
	createdAt : { type: Date, default: Date.now },
	updatedAt : { type: Date },
	deletedAt : { type: Date }
});



module.exports = mongoose.model('Domain', DomainSchema);
