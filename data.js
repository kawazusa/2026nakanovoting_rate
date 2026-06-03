const votingData = {
  // 前回 (令和4年5月22日執行 中野区長選挙)
  previous: {
    title: "令和4年5月22日執行 中野区長選挙",
    dateRange: ["5/16(月)", "5/17(火)", "5/18(水)", "5/19(木)", "5/20(金)", "5/21(土)"],
    stations: {
      "区役所": [721, 1101, 1543, 1895, 2298, 3105],
      "南部すこやか": [149, 293, 412, 509, 666, 1064],
      "東部": [134, 216, 385, 460, 539, 906],
      "江古田": [85, 152, 262, 331, 407, 719],
      "野方": [174, 293, 432, 503, 704, 1111],
      "鷺宮": [189, 312, 340, 492, 723, 988]
    }
  },
  // 今回 (令和8年6月7日執行 中野区長選挙)
  current: {
    title: "令和8年6月7日執行 中野区長選挙",
    dateRange: ["6/1(月)", "6/2(火)", "6/3(水)", "6/4(木)", "6/5(金)", "6/6(土)"],
    // Gender-specific data (Male/Female)
    // null values for days 3-6 represent future days (not yet voted)
    stations: {
      "区役所": {
        male: [731, 594, null, null, null, null],
        female: [712, 690, null, null, null, null]
      },
      "南部すこやか": {
        male: [157, 156, null, null, null, null],
        female: [155, 190, null, null, null, null]
      },
      "東部": {
        male: [143, 140, null, null, null, null],
        female: [147, 158, null, null, null, null]
      },
      "江古田": {
        male: [88, 99, null, null, null, null],
        female: [95, 101, null, null, null, null]
      },
      "野方": {
        male: [160, 151, null, null, null, null],
        female: [166, 189, null, null, null, null]
      },
      "鷺宮": {
        male: [150, 144, null, null, null, null],
        female: [180, 185, null, null, null, null]
      }
    }
  }
};
