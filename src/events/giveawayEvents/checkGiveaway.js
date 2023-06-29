const Giveaway = require("../../models/Welcome"); 
var timerID = setInterval(function() {
    const currentDate = new Date();
    Giveaway.aggregate([
        {
          $match: {
            giveawayEnd: {
              $lt: currentDate,
            },
          },
        },
        {
          $project: {
            _id: 0,
            giveawayEnd: 1,
          },
        },
      ])
        .exec()
        .then((pastGiveaways) => {
       //   console.log('Past Giveaways:', pastGiveaways);
        })
        .catch((error) => {
          console.error('Error:', error);
        });
    
}, 60 * 1000); 