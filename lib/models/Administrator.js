"use strict";

let _         = require('lodash')
  ,debug      = require('debug')('models')
  ,bcrypt     = require('bcrypt-as-promised')
  ,SALT_WORK_FACTOR = 10
  ,MAX_LOGIN_ATTEMPTS = 5
  ,LOCK_TIME  = 2 * 60 * 60 * 1000;

let mongoose 	= require('mongoose');
let Schema 		= mongoose.Schema;

let AdministratorSchema = new Schema({
	username: { type: String, required: true, index: { unique: true } },
  password: { type: String, required: true },
  loginAttempts: { type: Number, default: 0 },
  //Account lockout properties
  // http://devsmash.com/blog/implementing-max-login-attempts-with-mongoose
  lockUntil: { type: Date },
  email: { type: String, required: true, index: { unique: true } },
  mobile: { type: String, required: false, index: { unique: true } },
  activated: { type: Boolean, default: false },
  firstName: { type: String },
  lastName: { type: String },
	createdAt : { type: Date, default: Date.now },
	updatedAt : { type: Date },
	deletedAt : { type: Date }
});

AdministratorSchema.virtual("isLocked").get(function(){
  return !!(this.lockUntil && this.lockUtil > _.now());
});

AdministratorSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    return bcrypt.genSalt(SALT_WORK_FACTOR)
      .then(function(salt) {
        // hash the password using our new salt
        return bcrypt.hash(user.password, salt);
      })
      .then(function(hash){
        user.password = hash;
        return next();
      })
      .catch(function(err){
        debug(err);
        return next(err);
      });
});

AdministratorSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password)
      .then(function(isMatch) {
          cb(null, isMatch);
      })
      .catch(function(err){
          return cb(err);
      });
};

let reasons = AdministratorSchema.failedLogin = {
    INVALID_CREDENTIAL: "invalid_credential",
    MAX_ATTEMPTS: "over_max_attempts_user_locked",
    NOT_ACTIVATED: 'user_account_not_activated_yet'
};

AdministratorSchema.methods.incLoginAttempts = function(cb){
    // if we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.update({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        }, cb);
    }
    // otherwise we're incrementing
    var updates = { $inc: { loginAttempts: 1 } };
    // lock the account if we've reached max attempts and it's not locked already
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + LOCK_TIME };
    }
    return this.update(updates, cb);
}

AdministratorSchema.statics.getAuthenticated = function(username, password, cb) {
    this.findOne({ username: username }, function(err, user){
        if(err) return cb(err);

        if(user === null){
          return cb(new Error(reasons.INVALID_CREDENTIAL));
        }

        if (!user.activated){
          return cb(new Error(reasons.NOT_ACTIVATED));
        }

        if (user.isLocked) {
            // just increment login attempts if account is already locked
            return user.incLoginAttempts(function(err) {
                if (err) return cb(err);
                return cb(new Error(reasons.MAX_ATTEMPTS));
            });
        }


        // test for a matching password
        user.comparePassword(password, function(err, isMatch) {
            if (err) return cb(err);

            // check if the password was a match
            if (isMatch) {
                // if there's no lock or failed attempts, just return the user
                if (!user.loginAttempts && !user.lockUntil) return cb(null, user);
                // reset attempts and lock info
                var updates = {
                    $set: { loginAttempts: 0 },
                    $unset: { lockUntil: 1 }
                };
                return user.update(updates, function(err) {
                    if (err) return cb(err);
                    return cb(null, user);
                });
            }

            // password is incorrect, so increment login attempts before responding
            user.incLoginAttempts(function(err) {
                if (err) return cb(err);
                return cb(new Error(reasons.INVALID_CREDENTIAL));
            });
        });
    });
}

module.exports = mongoose.model('Administrator', AdministratorSchema);
