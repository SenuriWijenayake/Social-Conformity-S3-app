var app = angular.module('app', []);
//var api = 'https://stark-sands-60128.herokuapp.com';
var api = 'http://localhost:5000';

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
        $scope.myAvatar = './assets/neutral.png';
        var username = "You";
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
  $scope.order = JSON.parse($window.sessionStorage.getItem('order'));
  $scope.currentUsername = $window.sessionStorage.getItem('username');

  $scope.question = {};
  $scope.sliderChanged = false;
  // $scope.explained = false;
  $scope.onbeforeunloadEnabled = true;
  $scope.count = 0;

  $("input[type='range']").change(function() {
    $scope.sliderChanged = true;
    $("#output").css("color", "green");
    $("#confidence-container").css("border", "none");
    $("#submit-button").css("display", "block");
    $(".explanation-box").css("border-color", "grey");
  });

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
      if ($scope.discussion) {
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
    //Resetting the red line
    if ($scope.question.questionNumber < 0) {
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
      //Remove the button
      $("#submit-button").css("display", "none");
      //Disbling the input
      $("input[type=radio]").attr('disabled', true);
      $("input[type=range]").attr('disabled', true);
      //Loader activated
      $("#loader").css("display", "block");
      $("#loader-text").css("display", "block");

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
        $timeout(function() {
          $scope.createFeedback(response.data.feedback);
        }, 3000);

      }, function(error) {
        console.log("Error occured when loading the feedback");
      });
    }
  };

  $scope.createFeedback = function(data) {
    $scope.feedback = data;
    $("#loader").css("display", "none");
    $("#loader-text").css("display", "none");
    $("#chart_div").css("display", "block");

    $timeout(function() {
      if ($scope.discussion == 'No') {
        $("#change-section-nd").css("display", "block");
      } else {
        $("#change-section").css("display", "block");
      }
    }, 2000);
  };

  $scope.createPublicFeedback = function(data){
    $scope.updatedFeedback = data;
    $("#loader-updated").css("display", "none");
    $("#loader-text-updated").css("display", "none");
    $("#updated_div").css("display", "block");

    //Add a next button
    $timeout(function() {
      if ($scope.discussion == 'No') {
        $("#change-section-nd").css("display", "block");
      } else {
        $("#change-section").css("display", "block");
      }
    }, 2000);
  };

  $scope.yes = function() {

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

  $scope.update = function() {

    if ($scope.sliderChanged) {

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

  $scope.showUpdatedAnswers = function() {
    //get updated feedback and display it in the relevant area
    if ($scope.sliderChanged) {
      //Remove the button
      $("#submit-button").css("display", "none");
      //Disbling the input
      $("input[type=radio]").attr('disabled', true);
      $("input[type=range]").attr('disabled', true);
      //Loader activated
      $("#loader-updated").css("display", "block");
      $("#loader-text-updated").css("display", "block");

      $scope.myAnswer.answerId = parseInt($scope.myAnswer.answerId);
      $scope.myAnswer.questionId = $scope.question.questionNumber;
      $scope.myAnswer.userId = $scope.userId;
      $scope.myAnswer.cues = $scope.cues;
      $scope.myAnswer.discussion = $scope.discussion;

      $http({
        method: 'POST',
        url: api + '/publicFeedback',
        data: $scope.myAnswer,
        type: JSON,
      }).then(function(response) {
        $scope.myAnswer.answerId = $scope.myAnswer.answerId.toString();
        $timeout(function() {
          $scope.createPublicFeedback(response.data.feedback);
        }, 3000);

      }, function(error) {
        console.log("Error occured when loading the feedback");
      });

    }
  };

  $scope.next = function() {
    //Remove the question area and chart area
    $("#question-area").css("display", "none");
    $("#chart-area").css("display", "none");

    $("#change-section").css("display", "none");
    $("#change-section-nd").css("display", "none");

    $scope.count = 0;

    //Make the input enabled and submit invisible
    $("input[type=radio]").attr('disabled', false);
    $("input[type=range]").attr('disabled', false);

    $("#submit-button").css("display", "none");
    $("#confidence-container").css("display", "none");

    //Handling the ending of the quiz and directing to the big five questionnaire
    if ($scope.currentQIndex == 16) {
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

        //Display the new question area and chart area
        $("#question-area").css("display", "block");
        $("#chart-area").css("display", "block");

        $scope.myAnswer = {};
        $scope.sliderChanged = false;
        $scope.explained = false;
        $scope.myAnswer.confidence = 50;
        $scope.question = response.data;

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
  };

  //Function to adjust scrolling - not working
  $scope.scrollAdjust = function() {
    var element = document.getElementById("text-area");
    element.scrollTop = element.scrollHeight;
  };

  //Connecting the client to the socket
  $scope.userState = 'ready';
  $scope.history = [];
  var socket = io.connect('http://localhost:5000');
  socket.emit('new_connection', {
    'username': $scope.currentUsername,
    'avatar': $scope.myAvatar
  });

  //Sending the initial messages
  $timeout(function() {
    $scope.history.push({
      name: "QuizBot",
      avatar: "qb.png",
      msg: "Hello " + $scope.currentUsername + "! Welcome to the quiz. This quiz contains 20 multilple-choice questions. You will be asked to answer each of them, with four other participants."
    });
  }, 1000);

  $timeout(function() {
    $scope.scrollAdjust();
  }, 1000);

  $timeout(function() {
    $scope.history.push({
      name: "QuizBot",
      avatar: "qb.png",
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
      avatar: data.avatar
    });
    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);

    $timeout(function() {
      $scope.history.push({
        name: "QuizBot",
        avatar: "qb.png",
        msg: "Type 'GO' to start the quiz."
      });
    }, 1500);

    $timeout(function() {
      $scope.scrollAdjust();
    }, 1500);

  });

  //When you receive a new broadcast message
  socket.on('new_message', (data) => {
    $scope.history.push({
      name: data.username,
      msg: data.message,
      class: data.class,
      avatar: data.avatar
    });
    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);
  });

  //When someone connected to the channel
  socket.on('connected', (data) => {
    $scope.history.push({
      msg: data.message,
      class: data.class
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
            avatar: $scope.myAvatar
          });
          $scope.go();

        } else {
          $scope.history.push({
            name: "QuizBot",
            avatar: "qb.png",
            msg: "You have already started the quiz."
          });
        }
        $scope.message = "";
      } else if (handle == "done") {
        socket.emit('new_message', {
          'username': $scope.currentUsername,
          'message': $scope.message,
          'avatar': $scope.myAvatar
        });

        $timeout(function() {
          $scope.history.push({
            name: "QuizBot",
            avatar: "qb.png",
            msg: "You may change your answer, confidence or explanation now."
          });
        }, 1000);

        //Show change box
        $timeout(function() {
          $("#change-section").css("display", "block");
        }, 1500);

      } else {
        socket.emit('new_message', {
          'username': $scope.currentUsername,
          'message': $scope.message,
          'avatar': $scope.myAvatar
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
