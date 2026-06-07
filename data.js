const votingData = {
  // 前回 (令和4年5月22日執行 中野区長選挙)
  previous: {
    title: "令和4年5月22日執行 中野区長選挙",
    dateRange: ["5/16(月)", "5/17(火)", "5/18(x)", "5/19(木)", "5/20(金)", "5/21(土)"],
    stations: {
      "区役所": [721, 1101, 1543, 1895, 2298, 3105],
      "南部すこやか": [149, 293, 412, 509, 666, 1064],
      "東部": [134, 216, 385, 460, 539, 906],
      "江古田": [85, 152, 262, 331, 407, 719],
      "野方": [174, 293, 432, 503, 704, 1111],
      "鷺宮": [189, 312, 340, 492, 723, 988]
    }
  },
  // 過去の中野区長選挙の投票率データ
  pastElections: [
    { "label": "昭和22年4月5日", "shortLabel": "S22 (4/5)", "total": 53.86, "male": 52.04, "female": 56.10 },
    { "label": "昭和26年4月23日", "shortLabel": "S26 (4/23)", "total": 68.50, "male": 66.12, "female": 70.90 },
    { "label": "昭和50年4月27日", "shortLabel": "S50 (4/27)", "total": 54.10, "male": 51.37, "female": 56.68 },
    { "label": "昭和54年4月22日", "shortLabel": "S54 (4/22)", "total": 57.59, "male": 54.46, "female": 60.51 },
    { "label": "昭和58年4月24日", "shortLabel": "S58 (4/24)", "total": 57.09, "male": 53.65, "female": 60.33 },
    { "label": "昭和61年6月15日", "shortLabel": "S61 (6/15)", "total": 44.20, "male": 41.75, "female": 46.54 },
    { "label": "平成2年6月3日", "shortLabel": "H2 (6/3)", "total": 41.56, "male": 38.69, "female": 44.27 },
    { "label": "平成10年5月24日", "shortLabel": "H10 (5/24)", "total": 25.21, "male": 23.83, "female": 26.54 },
    { "label": "平成14年6月9日", "shortLabel": "H14 (6/9)", "total": 33.42, "male": 31.46, "female": 35.31 },
    { "label": "平成18年6月11日", "shortLabel": "H18 (6/11)", "total": 27.73, "male": 25.99, "female": 29.44 },
    { "label": "平成22年5月23日", "shortLabel": "H22 (5/23)", "total": 30.28, "male": 29.12, "female": 31.44 },
    { "label": "平成26年6月8日", "shortLabel": "H26 (6/8)", "total": 29.49, "male": 28.05, "female": 30.94 },
    { "label": "平成30年6月10日", "shortLabel": "H30 (6/10)", "total": 34.45, "male": 32.99, "female": 35.92 },
    { "label": "令和4年5月22日", "shortLabel": "R4 (5/22)", "total": 33.72, "male": 32.55, "female": 34.89 }
  ],
  
  // 当日投票状況 (時間別速報)
  todayVoting: [
      {
          "time": "8時",
          "currentVotes": 50,
          "currentRate": 0.02,
          "previousVotes": 0,
          "previousRate": 0.0
      },
      {
          "time": "9時",
          "currentVotes": 1650,
          "currentRate": 0.6,
          "previousVotes": 1650,
          "previousRate": 0.6
      },
      {
          "time": "10時",
          "currentVotes": 5750,
          "currentRate": 2.09,
          "previousVotes": 5750,
          "previousRate": 2.1
      },
      {
          "time": "11時",
          "currentVotes": 12000,
          "currentRate": 4.36,
          "previousVotes": 11950,
          "previousRate": 4.37
      },
      {
          "time": "12時",
          "currentVotes": 19900,
          "currentRate": 7.23,
          "previousVotes": 19650,
          "previousRate": 7.19
      },
      {
          "time": "13時",
          "currentVotes": 26600,
          "currentRate": 9.66,
          "previousVotes": 26100,
          "previousRate": 9.55
      }
  ],
  
  // 今回 (令和8年6月7日執行 中野区長選挙)
  current: {
    title: "令和8年6月7日執行 中野区長選挙",
    dateRange: ["6/1(月)", "6/2(火)", "6/3(水)", "6/4(木)", "6/5(金)", "6/6(土)"],
    stations: {
    "区役所": {
      male: [731, 594, 388, 1089, 1330, 2558],
      female: [712, 690, 323, 1352, 1772, 2906]
    },
    "南部すこやか": {
      male: [157, 156, 106, 304, 358, 734],
      female: [155, 190, 99, 372, 552, 917]
    },
    "東部": {
      male: [143, 140, 72, 215, 343, 619],
      female: [147, 158, 74, 306, 454, 716]
    },
    "江古田": {
      male: [88, 99, 67, 178, 213, 487],
      female: [95, 101, 55, 235, 298, 569]
    },
    "野方": {
      male: [160, 151, 95, 287, 388, 728],
      female: [166, 189, 101, 411, 608, 934]
    },
    "鷺宮": {
      male: [150, 144, 65, 249, 363, 685],
      female: [180, 185, 62, 369, 563, 918]
    }
    }
  }
};
