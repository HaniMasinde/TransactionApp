"use strict";

module.exports = {
  ...require("./authValidator"),
  ...require("./memberValidator"),
  ...require("./roleValidator"),
  ...require("./transactionValidator")
};
