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
    if (user.cues && user.discussion && user.gender && user.age && user.education && user.field && (user.gender == 'specified' ? user.genderSpecified : true) && (user.cues == 'Yes' ? user.name : true) && (user.age >= 18)) {
      $("#index-next").attr('disabled', true);
      $("#index-next").css('background-color', 'grey');
      $("#index-instructions").css("display", "block");

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
    if (user.cues && user.discussion && user.gender && user.age && user.education && user.field && (user.gender == 'specified' ? user.genderSpecified : true) && (user.cues == 'Yes' ? user.name : true) && (user.age >= 18)) {

      $("#index-submit-button").attr('disabled', true);
      $("#index-loader").css("display", "block");

      if (!user.name) {
        user.name = "User C";
      }

      $http({
        method: 'POST',
        url: api + '/user',
        data: user,
        type: JSON,
      }).then(function(response) {
        $window.sessionStorage.setItem('userId', response.data.id);
        $window.sessionStorage.setItem('cues', user.cues);
        $window.sessionStorage.setItem('discussion', user.discussion);
        $window.sessionStorage.setItem('username', user.name);
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
  $scope.discussion = $window.sessionStorage.getItem('discussion');
  $scope.currentUsername = $window.sessionStorage.getItem('username');
  $scope.order = JSON.parse($window.sessionStorage.getItem('order'));

  $scope.question = {};
  $scope.sliderChanged = false;
  $scope.explained = false;
  $scope.onbeforeunloadEnabled = true;
  $scope.count = 0;

  $("input[type='range']").change(function() {
    $scope.sliderChanged = true;
    $("#output").css("color", "green");
    $("#confidence-container").css("border", "none");
    if ($scope.explained) {
      $("#submit-button").css("display", "block");
      $(".explanation-box").css("border-color", "grey");
    } else {
      $(".explanation-box").css("border", "2px solid red");
      $(".explanation-box").focus();
    }
  });

  $('.explanation-box').keyup(function() {
    if ($scope.myAnswer.explanation != "") {
      $scope.explained = true;
      $(".explanation-box").css("border-color", "grey");
    }
    if ($scope.sliderChanged && $scope.myAnswer.explanation != "") {
      $scope.explained = true;
      $("#submit-button").css("display", "block");
      $(".explanation-box").css("border-color", "grey");
    }
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

    if($scope.discussion == 'No'){
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
      if($scope.discussion){
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
    if (!$scope.explained) {
      $(".explanation-box").focus();
    }
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
    if ($scope.sliderChanged && $scope.myAnswer.explanation != "") {
      //Remove the button
      $("#submit-button").css("display", "none");
      $(".explanation-box").css("border", "2px solid grey");
      //Disbling the input
      $("input[type=radio]").attr('disabled', true);
      $("input[type=range]").attr('disabled', true);
      $(".explanation-box").attr('disabled', true);
      //Loader activated
      $("#loader").css("display", "block");
      $("#loader-text").css("display", "block");

      $scope.myAnswer.answerId = parseInt($scope.myAnswer.answerId);
      $scope.myAnswer.questionId = $scope.question.questionNumber;
      $scope.myAnswer.userId = $scope.userId;
      $scope.myAnswer.cues = $scope.cues;
      $scope.myAnswer.discussion = $scope.discussion;

      $http({
        method: 'POST',
        url: api + '/feedback',
        data: $scope.myAnswer,
        type: JSON,
      }).then(function(response) {
        $scope.myAnswer.answerId = $scope.myAnswer.answerId.toString();
        $timeout(function() {
          if ($scope.myAnswer.cues != "Yes") {
            $scope.createControlFeedback(response.data.feedback);
          } else {
            $scope.avatarFeedback(response.data.feedback);
          }
        }, 3000);

      }, function(error) {
        console.log("Error occured when loading the chart");
      });
    }
  };

  $scope.avatarFeedback = function(data) {
    $scope.feedback = data;
    $("#loader").css("display", "none");
    $("#loader-text").css("display", "none");

    $("#avatar_div").css("display", "block");

    if ($scope.cues == 'No' && $scope.discussion == 'No') {
      $timeout(function() {
        $("#change-section-ncnd").css("display", "block");
      }, 2000);
    } else if ($scope.cues == 'Yes' && $scope.discussion == 'No') {
      $timeout(function() {
        $("#change-section-cnd").css("display", "block");
      }, 2000);
    } else {
      $timeout(function() {
        $("#change-section").css("display", "block");
      }, 2000);
    }

  };

  $scope.createControlFeedback = function(feedback) {
    $scope.controlFeedback = feedback;
    $("#loader").css("display", "none");
    $("#loader-text").css("display", "none");

    $("#chart_div").css("display", "block");

    if ($scope.cues == 'No' && $scope.discussion == 'No') {
      $timeout(function() {
        $("#change-section-ncnd").css("display", "block");
      }, 2000);
    } else if ($scope.cues == 'Yes' && $scope.discussion == 'No') {
      $timeout(function() {
        $("#change-section-cnd").css("display", "block");
      }, 2000);
    } else {
      $timeout(function() {
        $("#change-section").css("display", "block");
      }, 2000);
    }
  };

  $scope.yes = function() {

    $scope.count = 1;

    $("#submit-button").css("display", "none");

    //Make the input enabled
    $("input[type=radio]").attr('disabled', false);
    $("input[type=range]").attr('disabled', false);
    $(".explanation-box").attr('disabled', false);

    //Remove change section buttons
    if ($scope.cues == 'No' && $scope.discussion == 'No') {
      $("#change-section-ncnd").css("display", "none");
    } else if ($scope.cues == 'Yes' && $scope.discussion == 'No') {
      $("#change-section-cnd").css("display", "none");
    } else {
      $("#change-section").css("display", "none");
    }

    //Set the confidence to 50
    $scope.myAnswer.confidence = 50;
    $scope.sliderChanged = false;
    $scope.explained = false;

    $(".explanation-box").val("");
    $("#output").val("Not Specified");
    $("#output").css("color", "red");
  };

  $scope.update = function() {

    if ($scope.sliderChanged && $scope.explained) {

      //Remove the question area and chart area
      $("#question-area").css("display", "none");
      $("#chart-area").css("display", "none");
      $("#avatar-area").css("display", "none");

      $("#change-section-ncnd").css("display", "none");
      $("#change-section-cnd").css("display", "none");
      $("#change-section").css("display", "none");

      //Disable the button
      $("#submit-button").attr("disabled", "disabled");
      $("#confidence-container").css("display", "none");

      $scope.myAnswer.answerId = parseInt($scope.myAnswer.answerId);
      $scope.myAnswer.explanation = $scope.myAnswer.explanation;
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
    //Remove the question area and chart area
    $("#question-area").css("display", "none");
    $("#chart-area").css("display", "none");
    $("#avatar-area").css("display", "none");

    $("#change-section").css("display", "none");
    $("#change-section-ncnd").css("display", "none");
    $("#change-section-cnd").css("display", "none");

    $scope.count = 0;

    //Make the input enabled and submit invisible
    $("input[type=radio]").attr('disabled', false);
    $("input[type=range]").attr('disabled', false);
    $(".explanation-box").attr('disabled', false);

    $("#submit-button").css("display", "none");
    $("#confidence-container").css("display", "none");

    //Handling the ending of the quiz and directing to the big five questionnaire
    if ($scope.currentQIndex == 17) {
      //Disable the confirmation message
      $scope.onbeforeunloadEnabled = false;
      //Save chat messages to the database
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
        $("#avatar-area").css("display", "block");
        // $("#change-section").css("display", "block");

        $scope.myAnswer = {};
        $scope.sliderChanged = false;
        $scope.explained = false;
        $scope.myAnswer.confidence = 50;
        $(".explanation-box").val("");
        $scope.question = response.data;

        if ($scope.question.img) {
          $("#image-container").css("display", "inline");
        } else {
          $("#image-container").css("display", "none");
        }

        $("#loader").css("display", "none");
        $("#loader-text").css("display", "none");
        $("#chart_div").css("display", "none");
        $("#avatar_div").css("display", "none");

        $("#change-section").css("display", "none");
        $("#change-section-ncnd").css("display", "none");
        $("#change-section-cnd").css("display", "none");

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
    'username': $scope.currentUsername
  });

  //Sending the initial messages
  $timeout(function() {
    $scope.history.push({
      name: "QuizBot",
      msg: "Hello " + $scope.currentUsername + "! Welcome to the quiz. You will be asked to answer 18 multilple-choice questions in this quiz, with four other participants."
    });
  }, 1000);

  $timeout(function() {
    $scope.history.push({
      name: "QuizBot",
      msg: "You will first answer each question individually. Next, you will see group answers. Then you may discuss the group's answers through this chat. Subsequent to the group discussion, you can make changes to your answer, confidence level or explanation." +
      " If the instructions are clear, type GO to start the quiz!"});
  }, 2000);

  socket.on('new_message', (data) => {
    $scope.history.push({
      name: data.username,
      msg: data.message
    });
    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);
  });

  socket.on('connected', (data) => {
    $scope.history.push({
      name: data.username,
      msg: data.message
    });
    $timeout(function() {
      $scope.scrollAdjust();
      $("#chat-text").focus();
    }, 1000);
  });

  $scope.go = function() {

    $("#question-area").css("display", "inline");
    $("#qBox").css("border", "solid red");

    $scope.history.push({
      name: "QuizBot",
      msg: "You just started the quiz!"
    });

    $scope.userState = "started"; //Started the quiz
    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);
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
            msg: $scope.message
          });
          $scope.go();

        } else {
          $scope.history.push({
            name: "QuizBot",
            msg: "You have already started the quiz."
          });
        }
        $scope.message = "";
      } else {
        socket.emit('new_message', {
          'username': $scope.currentUsername,
          'message': $scope.message
        });
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
