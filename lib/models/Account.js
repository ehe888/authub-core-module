"use strict"

let mongoose 	= require('mongoose');
let Schema 		= mongoose.Schema;
let randomstring	= require("randomstring");


let AccountSchema = new Schema({
	name: { type: String, index: {unique: true }, required: true },
	accessToken: {
		secret: { type: String, required: true, default: randomstring.generate(32) },
		expiresIn: { type: Number, required: true, default: 7200 }, //Default age of JWT token is 7200 seconds
		algorithm: { type: String, required: true, default: 'HS256' } //Default algorithm HMAC + SHA256
	},
	refreshToken: {
		secret: { type: String, required: true, default: randomstring.generate(64) },
		expiresIn: { type: Number, required: true, default: 7200 * 12 * 30 }, //Default age of JWT token is 30 days
		algorithm: { type: String, required: true, default: 'HS256' }
	},
	mongodb: {
		server: { type: String, required: true, default: "localhost" },
		port: { type: Number, required: true, default: 27017}
	},
	creator: {
		email: { type: String, required: true, index: { unique: true } },
	  mobile: { type: String, required: false, index: { unique: true } },
	  activated: { type: Boolean, default: false },
	  firstName: { type: String },
	  lastName: { type: String }
	},
	createdAt : { type: Date, default: Date.now },
	updatedAt : { type: Date },
	deletedAt : { type: Date }
});

module.exports = mongoose.model('Account', AccountSchema);
