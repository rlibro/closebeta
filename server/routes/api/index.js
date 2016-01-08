'use strict';

var express = require('express');
var router = express.Router();

router.use('/countries', require('./country'));
router.use('/redbooks', require('./redbook'));
router.use('/notes', require('./note'));
router.use('/find', require('./find'));


module.exports = router;

