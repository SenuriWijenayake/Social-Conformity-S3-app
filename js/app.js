var app = angular.module('app', []);
var api = 'https://mysterious-badlands-68636.herokuapp.com';
// var api = 'http://localhost:5000';

app.controller('BigFiveController', function($scope, $http, $window) {
  $http({
    method: 'GET',
    url: api + '/bigFiveQuestions'
  }).then(function(response) {
    $scope.questions = response.data;
    document.getElementById('userId').value = $window.sessionStorage.getItem('userId');
  }, function(error) {
    console.log("Error occured when loading the big five questions");
  });

});

app.controller('HomeController', function($scope, $http, $window, $timeout) {
  $scope.user = {};

  $('#gender-specified').change(function() {
    if (this.checked) {
      $('#gender-text').prop('required', true);
    } else {
      $('#gender-text').prop('required', false);
    }
  });

  $scope.indexNext = function(user) {
    if (user.cues && user.discussion && user.visibility && user.gender && user.age && user.education && user.field && (user.gender == 'specified' ? user.genderSpecified : true) && (user.cues == 'letter' ? user.name : true) && (user.age >= 18)) {
      $("#index-next").attr('disabled', true);
      $(".input-text").attr('disabled', true);
      $(".radio-button").attr('disabled', true);
      $("#index-next").css('background-color', 'grey');
      $("#index-instructions").css("display", "block");

      //For initial condition, get the avatar
      if (user.cues == 'letter') {
        var api = 'https://ui-avatars.com/api/?name=';
        //Get first name and last name of the user
        var res = user.name.split(" ");
        var firstName = res[0];
        var lastName = res[res.length - 1];
        var final = api + firstName + '+' + lastName + '&rounded=true&background=EBEDEF&color=000000&bold=true';
        $scope.myAvatar = final;
        $("#example_avatar").attr("src", final);
        //Create username
        var username = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
      } else {
        $scope.myAvatar = './assets/icons/new/neutral.png';
        var username = "User 3";
      }
      $window.sessionStorage.setItem('username', username);
      $window.sessionStorage.setItem('avatar', $scope.myAvatar);

      $timeout(function() {
        $("#connection-pending").css("display", "block");
      }, 1500);

      $timeout(function() {
        $("#connection-pending").css("display", "none");
        $("#connection-success").css("display", "block");
        $("#submit-section").css("display", "block");
      }, 8500);

    }
  }

  $scope.submitDetails = function(user) {

    if (user.cues && user.discussion && user.visibility && user.gender && user.age && user.education && user.field && (user.cues == 'letter' ? user.name : true) && (user.gender == 'specified' ? user.genderSpecified : true) && (user.age >= 18)) {

      $("#index-submit-button").attr('disabled', true);
      $("#index-loader").css("display", "block");

      $http({
        method: 'POST',
        url: api + '/user',
        data: user,
        type: JSON,
      }).then(function(response) {
        $window.sessionStorage.setItem('userId', response.data.id);
        $window.sessionStorage.setItem('cues', user.cues);
        $window.sessionStorage.setItem('discussion', user.discussion);
        $window.sessionStorage.setItem('visibility', user.visibility);
        $window.sessionStorage.setItem('order', JSON.stringify(response.data.order));
        $window.location.href = './quiz.html';

      }, function(error) {
        console.log("Error occured when submitting user details");
      });
    }

  };
});

app.controller('QuizController', function($scope, $http, $window, $timeout) {

  $scope.currentQIndex = 0;

  $scope.userId = $window.sessionStorage.getItem('userId');
  $scope.cues = $window.sessionStorage.getItem('cues');
  $scope.visibility = $window.sessionStorage.getItem('visibility');
  $scope.discussion = $window.sessionStorage.getItem('discussion');
  $scope.myAvatar = $window.sessionStorage.getItem('avatar');
  // $scope.set = $window.sessionStorage.getItem('set');
  $scope.order = JSON.parse($window.sessionStorage.getItem('order'));
  $scope.currentUsername = $window.sessionStorage.getItem('username');
  $scope.IsUpdated = false;

  $scope.question = {};
  $scope.sliderChanged = false;
  // $scope.explained = false;
  $scope.onbeforeunloadEnabled = true;
  $scope.count = 0;
  var x;

  $scope.startTimer = function() {
    // Set the date we're counting down to
    var dt = new Date();
    dt.setMinutes(dt.getMinutes() + 2);
    var countDownDate = dt;

    // Update the count down every 1 second
    x = setInterval(function() {
      // Get today's date and time
      var now = new Date().getTime();
      // Find the distance between now and the count down date
      var distance = countDownDate - now;
      var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      var seconds = Math.floor((distance % (1000 * 60)) / 1000);

      // Display the result in the element with id="demo"
      document.getElementById("timer").innerHTML = "Time reamining : " + minutes + "m " + seconds + "s ";

      // If the count down is finished, write some text
      if (distance < 0) {
        //Stop the timer
        clearInterval(x);
        $("#timer").css("display", "none");
        document.getElementById("timer").innerHTML = "Time reamining : 2m 00s";

        //Ask them to change now
        socket.emit('time_up', {
          'message': "Time is up! You may change your answer if you want now.",
          'username': "QuizBot",
          'avatar': "qb.png"
        });
        $("#change-section").css("display", "block");
        //Disable the chat till next discussion
        $("#chat-text").attr("disabled", true);
        $(".send-button").css("background-color", "grey");
        $(".send-button").css("border", "1px solid grey");

        $timeout(function() {
          $scope.scrollAdjust();
        }, 500);
      }
    }, 500);
  };

  $("input[type='range']").change(function() {
    if ($scope.IsUpdated) {
      $scope.myAnswer.selectedUpdatedConf = $scope.getTimestamp();
    } else {
      $scope.myAnswer.selectedConf = $scope.getTimestamp();
    }

    $scope.sliderChanged = true;
    $("#output").css("color", "green");
    $("#confidence-container").css("border", "none");
    $("#submit-button").css("display", "block");
    $(".explanation-box").css("border-color", "grey");

  });

  function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
    }
    return a;
  };

  //Setting question one
  $http({
    method: 'POST',
    url: api + '/question',
    data: {
      id: $scope.order[$scope.currentQIndex]
    },
    type: JSON,
  }).then(function(response) {
    $scope.currentQIndex += 1;
    $scope.question = response.data;
    if ($scope.question.img) {
      $("#image-container").css("display", "inline");
    } else {
      $("#image-container").css("display", "none");
    }

    if ($scope.discussion == 'No') {
      $("#question-area").css("display", "inline");
      $("#qBox").css("border", "solid red");
      $scope.myAnswer.sawQuestion = $scope.getTimestamp();
    }

  }, function(error) {
    console.log("Error occured when getting the first question");
  });

  //Confirmation message before reload and back
  $window.onbeforeunload = function(e) {
    if ($scope.onbeforeunloadEnabled) {
      var dialogText = 'You have unsaved changes. Are you sure you want to leave the site?';
      e.returnValue = dialogText;

      //Disconnect sockets if there are any
      if ($scope.discussion == 'Yes') {
        socket.disconnect();
      }
      return dialogText;
    }
  };

  //Initialization
  $scope.count = 0;
  $scope.myAnswer = {};
  $scope.myAnswer.confidence = 50;
  $scope.myAnswer.userId = $scope.userId;
  $scope.myAnswer.cues = $scope.cues;
  $scope.myAnswer.discussion = $scope.discussion;

  //Show only when the answer is selected
  $scope.clicked = function() {
    if ($scope.IsUpdated) {
      $scope.myAnswer.selectedUpdatedOption = $scope.getTimestamp();
    } else {
      $scope.myAnswer.selectedOption = $scope.getTimestamp();
    }

    //Resetting the red line
    if ($scope.currentQIndex == 1) {
      $("#qBox").css("border", "none");
      $("#confidence-container").css("display", "block");
      if (!$scope.sliderChanged) {
        $("#confidence-container").css("border", "solid red");
      }
    } else {
      $("#confidence-container").css("display", "block");
    }
  };

  $scope.submitAnswer = function() {
    if ($scope.sliderChanged) {
      $scope.myAnswer.clickedSubmit = $scope.getTimestamp();
      //Remove the button
      $("#submit-button").css("display", "none");
      //Disbling the input
      $("input[type=radio]").attr('disabled', true);
      $("input[type=range]").attr('disabled', true);
      //Loader activated
      $("#loader").css("display", "block");
      $("#loader-text").css("display", "block");
      $("#progress-bar").css("display", "block");

      //Disable chat box
      $("#chat-text").attr("disabled", true);
      $(".send-button").css("background-color", "grey");
      $(".send-button").css("border", "1px solid grey");

      $scope.myAnswer.answerId = parseInt($scope.myAnswer.answerId);
      $scope.myAnswer.questionId = $scope.question.questionNumber;
      $scope.myAnswer.userId = $scope.userId;
      $scope.myAnswer.cues = $scope.cues;
      $scope.myAnswer.discussion = $scope.discussion;
      $scope.myAnswer.visibility = $scope.visibility;
      $scope.myAnswer.myAvatar = $scope.myAvatar;
      $scope.myAnswer.username = $scope.currentUsername;

      $http({
        method: 'POST',
        url: api + '/feedback',
        data: $scope.myAnswer,
        type: JSON,
      }).then(function(response) {
        $scope.myAnswer.answerId = $scope.myAnswer.answerId.toString();
        $scope.showTicks(response, false);
      }, function(error) {
        console.log("Error occured when loading the feedback");
      });
    }
  };

  $scope.showTicks = function(response, isUpdate) {
    //Random ticks visible
    var ticks;
    if (isUpdate) {
      ticks = shuffle(["tick-5", "tick-6", "tick-7", "tick-8"]);
    } else {
      ticks = shuffle(["tick-1", "tick-2", "tick-3", "tick-4"]);
    }
    var randomTimes = [$scope.randomTime(3000, 10000), $scope.randomTime(3000, 10000), $scope.randomTime(3000, 10000), $scope.randomTime(3000, 10000)].sort();

    $timeout(function() {
      $("#" + ticks[0]).css("display", "block");
    }, randomTimes[0]);

    $timeout(function() {
      $("#" + ticks[1]).css("display", "block");
    }, randomTimes[1]);

    $timeout(function() {
      $("#" + ticks[2]).css("display", "block");
    }, randomTimes[2]);

    $timeout(function() {
      $("#" + ticks[3]).css("display", "block");
    }, randomTimes[3]);

    if (isUpdate) {
      $timeout(function() {
        $scope.createUpdatedFeedback(response);
        $(".tick").css("display", "none");
      }, randomTimes[3] + 2000);
    } else {
      $timeout(function() {
        $scope.createFeedback(response.data.feedback);
        $(".tick").css("display", "none");
      }, randomTimes[3] + 2000);
    }
  };

  $scope.randomTime = function(min, max) {
    var random = Math.floor(Math.random() * (+max - +min)) + +min;
    return random;
  };

  $scope.getRandomUser = function(){
    if ($scope.cues == 'avatar'){
      return ("User " + (Math.floor(Math.random() * 5) + 1));
    } else {
      return (shuffle["JG", "NB", "DH", "BS", $scope.currentUsername][0]);
    }
  };

  $scope.createFeedback = function(data) {
    $scope.myAnswer.sawFeedback = $scope.getTimestamp();
    $scope.feedback = data;
    $("#loader").css("display", "none");
    $("#loader-text").css("display", "none");
    $("#progress-bar").css("display", "none");
    $("#chart_div").css("display", "block");

    if ($scope.discussion == 'No') {
      $timeout(function() {
        $("#change-section-nd").css("display", "block");
      }, 2000);
    } else {
      //Enable the chat box
      $("#chat-text").attr("disabled", false);
      $(".send-button").css("background-color", "#117A65");
      $(".send-button").css("border", "1px solid #117A65");

      $timeout(function() {
        socket.emit('new_message', {
          'message': "You have a maximum of two minutes to discuss the answers with your group members now. When explaining the rationale behind your answer, use the format 'answer - explanation why you think this is the right answer'." +
          "The objective of this exercise is to clarify doubts and arrive at the best possible answer. This chat will be disabled after two minutes. If you complete discussion before then, type 'DONE' to move forward.",
          'username': "QuizBot",
          'avatar': "qb.png"
        });
      }, 500);
      $timeout(function() {
        socket.emit('new_message', {
          'message': $scope.getRandomUser() + "you may start the discussion with your opinion.",
          'username': "QuizBot",
          'avatar': "qb.png"
        });
      }, 500);
      $timeout(function() {
        $scope.scrollAdjust();
        $scope.startTimer();
        socket.emit('start_timer', {});
      }, 1500);
      $timeout(function() {
        $("#timer").css("display", "block");
      }, 1600);
    }
  };

  $scope.yes = function() {

    socket.emit('making_changes', {
      'message': 'Participant is making a change to the answer. Please wait while they complete. You will be taken to the next question upon completion.',
      'username': 'QuizBot',
      'avatar': 'qb.png'
    });

    $scope.IsUpdated = true;
    $scope.myAnswer.selectedYes = $scope.getTimestamp();
    if ($scope.visibility == 'No') {
      $scope.count = 1;
    } else {
      $scope.count = 2;
    }

    $("#submit-button").css("display", "none");

    //Make the input enabled
    $("input[type=radio]").attr('disabled', false);
    $("input[type=range]").attr('disabled', false);

    //Remove change section buttons
    if ($scope.discussion == 'No') {
      $("#change-section-nd").css("display", "none");
    } else {
      $("#change-section").css("display", "none");
    }

    //Set the confidence to 50
    $scope.myAnswer.confidence = 50;
    $scope.sliderChanged = false;

    $("#output").val("Not Specified");
    $("#output").css("color", "red");
  };

  $scope.updateAndShowAnswers = function() {
    if ($scope.sliderChanged) {
      $scope.myAnswer.submittedUpdatedAnswer = $scope.getTimestamp();
      //Keep the text disabled
      $("#submit-button").css("display", "none");
      $("#chart-area").css("display", "none");
      //Disbling the input
      $("input[type=radio]").attr('disabled', true);
      $("input[type=range]").attr('disabled', true);
      //Loader activated
      $("#loader-updated").css("display", "block");
      $("#loader-text-updated").css("display", "block");
      $("#progress-bar-updated").css("display", "block");

      $scope.myAnswer.answerId = parseInt($scope.myAnswer.answerId);
      $scope.myAnswer.questionId = $scope.question.questionNumber;
      $scope.myAnswer.userId = $scope.userId;
      $scope.myAnswer.answerId = $scope.myAnswer.answerId.toString();

      var data = {
        "answer": $scope.myAnswer,
        "feedback": $scope.feedback
      };

      //HTTP Call
      $http({
        method: 'POST',
        url: api + '/updateAnswerAndShowFeedback',
        data: data,
        type: JSON,
      }).then(function(response) {
        $scope.myAnswer.answerId = $scope.myAnswer.answerId.toString();
        $scope.showTicks(response, true);

      }, function(error) {
        console.log("Error occured when updating the answers");
      });
    }
  };

  $scope.showPublicFeedback = function() {

    $scope.myAnswer.selectedNo = $scope.getTimestamp();
    //Show feedback without updating the answer as there is no change
    $("#change-section-nd").css("display", "none");
    $("#change-section").css("display", "none");
    $("#chart-area").css("display", "none");
    //Disbling the input
    $("input[type=radio]").attr('disabled', true);
    $("input[type=range]").attr('disabled', true);
    //Loader activated
    $("#loader-updated").css("display", "block");
    $("#loader-text-updated").css("display", "block");
    $("#progress-bar-updated").css("display", "block");

    $scope.myAnswer.answerId = parseInt($scope.myAnswer.answerId);
    $scope.myAnswer.questionId = $scope.question.questionNumber;
    $scope.myAnswer.userId = $scope.userId;
    $scope.myAnswer.answerId = $scope.myAnswer.answerId.toString();
    // $scope.myAnswer.set = $scope.set;

    var data = {
      "answer": $scope.myAnswer,
      "feedback": $scope.feedback
    };

    //HTTP Call
    $http({
      method: 'POST',
      url: api + '/showFeedbackOnly',
      data: data,
      type: JSON,
    }).then(function(response) {
      $scope.myAnswer.answerId = $scope.myAnswer.answerId.toString();
      $scope.showTicks(response, true);
    }, function(error) {
      console.log("Error occured when updating the answers");
    });
  };

  $scope.createUpdatedFeedback = function(response) {
    $("#loader-updated").css("display", "none");
    $("#loader-text-updated").css("display", "none");
    $("#progress-bar-updated").css("display", "none");
    $("#updated_div").css("display", "block");
    //Show feedback
    $scope.myAnswer.sawUpdatedFeedback = $scope.getTimestamp();
    $scope.updatedFeedback = response.data;
    if ($scope.discussion == 'Yes') {
      $("#updated-change-section").css("display", "block");
    } else {
      $("#updated-change-section-nd").css("display", "block");
    }
  };

  //For private condition
  $scope.update = function() {
    if ($scope.sliderChanged) {
      $scope.myAnswer.submittedUpdatedAnswer = $scope.getTimestamp();
      //Remove the question area and chart area
      $("#question-area").css("display", "none");
      $("#chart-area").css("display", "none");

      $("#change-section-nd").css("display", "none");
      $("#change-section").css("display", "none");

      //Disable the button
      $("#submit-button").attr("disabled", "disabled");
      $("#confidence-container").css("display", "none");

      $scope.myAnswer.answerId = parseInt($scope.myAnswer.answerId);
      $scope.myAnswer.questionId = $scope.question.questionNumber;
      $scope.myAnswer.userId = $scope.userId;

      $http({
        method: 'POST',
        url: api + '/updateAnswer',
        data: $scope.myAnswer,
        type: JSON,
      }).then(function(response) {
        $scope.next();
      }, function(error) {
        console.log("Error occured when updating the answers");
      });
    }
  };

  $scope.next = function() {
    $scope.myAnswer.selectedNext = $scope.getTimestamp();

    $http({
      method: 'POST',
      url: api + '/updateAnswerWithEvents',
      data: $scope.myAnswer,
      type: JSON,
    }).then(function(response) {
      $scope.IsUpdated = false;
      //Remove the question area and chart area
      $("#question-area").css("display", "none");
      $("#chart-area").css("display", "none");
      $("#updated_div").css("display", "none");

      $("#change-section").css("display", "none");
      $("#change-section-nd").css("display", "none");
      $("#updated-change-section").css("display", "none");
      $("#updated-change-section-nd").css("display", "none");

      $scope.count = 0;

      //Make the input enabled and submit invisible
      $("input[type=radio]").attr('disabled', false);
      $("input[type=range]").attr('disabled', false);

      $("#submit-button").css("display", "none");
      $("#confidence-container").css("display", "none");

      //Handling the ending of the quiz and directing to the big five questionnaire
      if ($scope.currentQIndex == 3) {
        //Disable the confirmation message
        $scope.onbeforeunloadEnabled = false;
        //Save chat messages to the database
        if ($scope.discussion == 'Yes') {
          var data = {
            userId: $scope.userId,
            chats: JSON.parse(angular.toJson($scope.history))
          };

          $http({
            method: 'POST',
            url: api + '/saveChats',
            data: data,
            type: JSON,
          }).then(function(response) {
              console.log("Chat messages saved successfully.");
              $window.location.href = './big-five.html';
              socket.emit('quiz_completed', {
                'message': 'Quiz completed!',
                'username': 'QuizBot',
                'avatar': 'qb.png'
              });
            },
            function(error) {
              console.log("Error occured when saving the chat messages.");
            });
        } else {
          //No Discussion
          $window.location.href = './big-five.html';
        }
      } else {
        $scope.userId = $window.sessionStorage.getItem('userId');
        var data = {
          id: $scope.order[$scope.currentQIndex]
        };

        $http({
          method: 'POST',
          url: api + '/question',
          data: data,
          type: JSON,
        }).then(function(response) {
          socket.emit('new_question', {
            'message': 'Moving to question ' + ($scope.currentQIndex + 1) + '/18.',
            'username': 'QuizBot',
            'avatar': 'qb.png',
            'info': response.data
          });
          //Disable the chat till next discussion
          $("#chat-text").attr("disabled", true);
          $(".send-button").css("background-color", "grey");
          $(".send-button").css("border", "1px solid grey");

          //Display the new question area and chart area
          $("#question-area").css("display", "block");
          $("#chart-area").css("display", "block");

          $scope.myAnswer = {};
          $scope.sliderChanged = false;
          $scope.explained = false;
          $scope.myAnswer.confidence = 50;
          $scope.question = response.data;
          $scope.myAnswer.sawQuestion = $scope.getTimestamp();

          if ($scope.question.img) {
            $("#image-container").css("display", "inline");
          } else {
            $("#image-container").css("display", "none");
          }

          $("#loader").css("display", "none");
          $("#loader-text").css("display", "none");
          $("#chart_div").css("display", "none");

          $("#change-section").css("display", "none");
          $("#change-section-nd").css("display", "none");

          $("#submit-button").prop("disabled", false);
          $("#output").val("Not Specified");
          $("#output").css("color", "red");

          $scope.currentQIndex += 1;

        }, function(error) {
          console.log("Error occured when loading the question");
        });
      }
    }, function(error) {
      console.log("Error occured while saving answer events");
    });
  };

  //Function to adjust scrolling - not working
  $scope.scrollAdjust = function() {
    var element = document.getElementById("text-area");
    element.scrollTop = element.scrollHeight;
  };

  //Function to get timestamp
  $scope.getTimestamp = function() {
    return Date.now();
  };


  //Connecting the client to the socket
  $scope.userState = 'ready';
  $scope.history = [];
  var socket = io.connect('https://mysterious-badlands-68636.herokuapp.com');
  // var socket = io.connect('http://localhost:5000');
  socket.emit('new_connection', {
    'username': $scope.currentUsername,
    'avatar': $scope.myAvatar
  });

  $timeout(function() {
    $scope.history.push({
      name: "QuizBot",
      avatar: "qb.png",
      timestamp: new Date().toUTCString(),
      msg: "Hello " + $scope.currentUsername + "! Welcome to the quiz. This quiz contains 18 multilple-choice questions. You will be asked to answer each of them, with four other participants."
    });
  }, 1000);

  $timeout(function() {
    $scope.scrollAdjust();
  }, 1000);

  $timeout(function() {
    $scope.history.push({
      name: "QuizBot",
      avatar: "qb.png",
      timestamp: new Date().toUTCString(),
      msg: "You will first answer each question individually. Next, you will see group answers. Then you may discuss the group's answers through this chat. Subsequent to the group discussion, you can make changes to your answer, confidence level or explanation."
    });
  }, 3000);

  $timeout(function() {
    $scope.scrollAdjust();
  }, 3000);

  //When you get the start signal
  socket.on('ready', (data) => {
    $("#chat-text").attr("disabled", false);
    $(".send-button").css("background-color", "#117A65");
    $(".send-button").css("border", "1px solid #117A65");

    $scope.history.push({
      name: data.username,
      msg: data.message,
      timestamp: new Date().toUTCString(),
      avatar: data.avatar
    });
    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);

    $timeout(function() {
      $scope.history.push({
        name: "QuizBot",
        avatar: "qb.png",
        timestamp: new Date().toUTCString(),
        msg: "Type 'GO' to start the quiz."
      });
    }, 1500);

    $timeout(function() {
      $scope.scrollAdjust();
    }, 1500);

  });

  //When you receive a new broadcast message
  socket.on('new_message', (data) => {
    $timeout(function() {
      $scope.history.push({
        name: data.username,
        msg: data.message,
        class: data.class,
        timestamp: new Date().toUTCString(),
        avatar: data.avatar
      });
    }, 100);

    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);
  });

  //When you receive a done signal
  socket.on('done', (data) => {

    $("#timer").css("display", "none");
    clearInterval(x);
    document.getElementById("timer").innerHTML = "Time reamining : 2m 00s";

    $timeout(function() {
      $scope.history.push({
        name: data.username,
        msg: data.message,
        class: data.class,
        timestamp: new Date().toUTCString(),
        avatar: data.avatar
      });
    }, 500);

    $timeout(function() {
      $scope.scrollAdjust();
    }, 600);

    $timeout(function() {
      $scope.history.push({
        name: "QuizBot",
        avatar: "qb.png",
        timestamp: new Date().toUTCString(),
        msg: "You may change your answer and confidence now."
      });
    }, 1000);

    $timeout(function() {
      $scope.scrollAdjust();
    }, 1100);
    //Show change box
    $timeout(function() {
      $("#change-section").css("display", "block");
      //Disable the chat till next discussion
      $("#chat-text").attr("disabled", true);
      $(".send-button").css("background-color", "grey");
      $(".send-button").css("border", "1px solid grey");
    }, 1500);
  });

  //When you receive the time up
  socket.on('time_up', (data) => {

    clearInterval(x);
    $("#timer").css("display", "none");
    document.getElementById("timer").innerHTML = "Time reamining : 2m 00s";

    $timeout(function() {
      $scope.history.push({
        name: data.username,
        msg: data.message,
        class: data.class,
        timestamp: new Date().toUTCString(),
        avatar: data.avatar
      });
    }, 100);

    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);
  });

  //On next question
  socket.on('new_question', (data) => {
    $timeout(function() {
      $scope.history.push({
        name: data.username,
        msg: data.message,
        class: data.class,
        timestamp: new Date().toUTCString(),
        avatar: data.avatar
      });
      $scope.scrollAdjust();
    }, 100);

    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);
  });

  //When someone connected to the channel
  socket.on('connected', (data) => {
    $scope.history.push({
      msg: data.message,
      class: data.class,
      timestamp: new Date().toUTCString()
    });
    $timeout(function() {
      $scope.scrollAdjust();
      $("#chat-text").focus();
    }, 1000);
  });

  $scope.go = function() {
    socket.emit('started', {
      'username': $scope.currentUsername,
      'question': $scope.question
    });

    $("#question-area").css("display", "inline");
    $("#qBox").css("border", "solid red");
    $scope.myAnswer.sawQuestion = $scope.getTimestamp();

    //Disable chat box
    $("#chat-text").attr("disabled", true);
    $(".send-button").css("background-color", "grey");
    $(".send-button").css("border", "1px solid grey");

    $scope.userState = "started"; //Started the quiz
  };


  //Call sendMessage on Enter
  var chatBox = document.getElementById("chat-text");

  // Execute a function when the user releases a key on the keyboard
  chatBox.addEventListener("keyup", function(event) {
    // Cancel the default action, if needed
    event.preventDefault();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      document.getElementById("sendButton").click();
    }
  });

  $scope.sendMessage = function() {
    if ($scope.message != undefined && $scope.message.trim().length != 0) {
      //Handle requests
      var handle = $scope.message.toLowerCase();
      if (handle == 'go') {
        if ($scope.userState == "ready") {
          $scope.history.push({
            name: $scope.currentUsername,
            msg: $scope.message,
            timestamp: new Date().toUTCString(),
            avatar: $scope.myAvatar
          });
          $scope.go();

        } else {
          $scope.history.push({
            name: "QuizBot",
            avatar: "qb.png",
            timestamp: new Date().toUTCString(),
            msg: "You have already started the quiz."
          });
        }
        $scope.message = "";
      } else if (handle == "done") {

        $("#timer").css("display", "none");
        clearInterval(x);
        document.getElementById("timer").innerHTML = "Time reamining : 2m 00s";

        socket.emit('done', {
          'username': $scope.currentUsername,
          'message': $scope.message,
          'avatar': $scope.myAvatar,
          'realUser': true
        });

      } else {
        socket.emit('new_message', {
          'username': $scope.currentUsername,
          'message': $scope.message,
          'avatar': $scope.myAvatar,
          'realUser': true
        });
        $timeout(function() {
          $scope.scrollAdjust();
        }, 500);
      }

      $scope.message = "";
      $timeout(function() {
        $scope.scrollAdjust();
      }, 500);
    }
  };

  $scope.isKeyAvailable = function(key, obj) {
    for (var i = 0; i < obj.length; i++) {
      if (key == obj[i].key) {
        return i;
      }
    }
    return -1;
  };

});
