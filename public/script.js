const socket = io()
const orderContainer = document.getElementById('display-order')
const logContainer = document.getElementById('log-container')
const roomContainer = document.getElementById('room-container')
const messageForm = document.getElementById('send-container')
const orderButton = document.querySelectorAll('#button-add')
const showButton = document.getElementById('showDialog');
const nameModal = document.getElementById('name-modal');
const txtuserName = document.getElementById('userName');
const confirmBtn = document.getElementById('confirmBtn');
const { to, registerPlugin, set, timeline } = gsap

gsap.registerPlugin(MorphSVGPlugin, Physics2DPlugin)

var orderDetail = '';
var orderJson;
var cookieUserName = getCookie('userName');

function confirmUserName() {
  userName = txtuserName.value;
  document.getElementById("inputForm").style.display = "none";
  setCookie('userName', userName, 1);
  appendLog('You joined')
  socket.emit('new-user', roomName, userName)
}

function setCookie(name, value, days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

if (cookieUserName == null) {
  document.getElementById("inputForm").style.display = "block";
} else {
  document.getElementById("inputForm").style.display = "none";
  socket.emit('old-user', roomName, cookieUserName)
}

// send food oder detail
function sendOrder(event) {
  orderDetail = {
    roomName: roomName,
    orderUser: cookieUserName,
    foodTitle: event.getAttribute('data-title'),
    foodPrice: event.getAttribute('data-price')
  };

  socket.emit('send-order', orderDetail)
}

socket.on('room-created', room => {
  const roomElement = document.createElement('div')
  roomElement.innerText = room
  const roomLink = document.createElement('a')
  roomLink.href = `/${room}`
  roomContainer.append(roomElement)
  roomContainer.append(roomLink)
})

socket.on('chat-message', data => {
  appendMessage(data.message)
})

socket.on('user-connected', name => {
  appendLog(`${name} connected`)
})

socket.on('user-disconnected', name => {
  appendLog(`${name} disconnected`)
})

socket.on('receive-order', orderDetail => {
  appendMessage(orderDetail)
})

function appendMessage(orderDetail) {
  const el = document.createElement('div')
  let el1 = "<li>"
  let el2 = "<strong id='order-user'>" + orderDetail.orderUser + "</strong>"
  let el3 = "<p id='order-info'>" + "đã đặt " + orderDetail.foodTitle + " x " + orderDetail.foodPrice + "</p>"
  let el4 = "</li>"
  el.innerHTML = el1 + el2 + el3 + el4
  orderContainer.appendChild(el)
}

function appendLog(log) {
  const logElement = document.createElement('li')
  logElement.innerText = log
  logContainer.append(logElement)
}

//gsap.globalTimeline.timeScale(.1);

document.querySelectorAll('.add-to-cart').forEach(button => {
    let background = button.querySelector('.background path')
    button.addEventListener('pointerdown', e => {
        if(button.classList.contains('active')) {
            return
        }
        to(button, {
            '--background-s': .97,
            duration: .1
        })
    })
    button.addEventListener('click', e => {
        e.preventDefault()
        if(button.classList.contains('active')) {
            return
        }
        button.classList.add('active')
        to(button, {
            keyframes: [{
                '--background-s': .97,
                duration: .1
            }, {
                '--background-s': 1,
                delay: .1,
                duration: .8,
                ease: 'elastic.out(1, .6)'
            }]
        })
        to(button, {
            '--text-x': '16px',
            '--text-o': 0,
            duration: .2
        })
        to(button, {
            keyframes: [{
                '--cart-x': '-12px',
                '--cart-s': 1,
                duration: .25
            }, {
                '--bottle-s': 1,
                '--bottle-o': 1,
                duration: .15,
                onStart() {
                    to(button, {
                        duration: .4,
                        keyframes: [{
                            '--bottle-r': '-8deg'
                        }, {
                            '--bottle-r': '8deg'
                        }, {
                            '--bottle-r': '0deg'
                        }]
                    })
                }
            }, {
                '--bottle-y': '0px',
                duration: .3,
                delay: .15,
                onStart() {
                    to(background, {
                        keyframes: [{
                            morphSVG: 'M0 19C0 10.7157 6.71573 4 15 4H41.4599C53.6032 4 62.4844 12 72.5547 12C82.6251 12 91.5063 4 103.65 4H137C139.761 4 142 6.23858 142 9V31C142 39.2843 135.284 46 127 46H5C2.23858 46 0 43.7614 0 41V19Z',
                            duration: .1,
                            delay: .18
                        }, {
                            morphSVG: 'M0 19C0 10.7157 6.71573 4 15 4H41.4599C53.6032 4 62.4844 4 72.5547 4C82.6251 4 91.5063 4 103.65 4H137C139.761 4 142 6.23858 142 9V31C142 39.2843 135.284 46 127 46H5C2.23858 46 0 43.7614 0 41V19Z',
                            duration: .8,
                            ease: 'elastic.out(1, .6)'
                        }]
                    })
                    to(button, {
                        '--bottle-s': .5,
                        duration: .15
                    })
                }
            }, {
                '--cart-y': '3px',
                duration: .1,
                onStart() {
                    to(button, {
                        keyframes: [{
                            '--check-y': '24px',
                            '--check-s': 1,
                            duration: .25
                        }, {
                            '--check-offset': '0px',
                            duration: .25
                        }]
                    })
                }
            }, {
                '--cart-y': '0px',
                duration: .2
            }, {
                '--cart-x': '-6px',
                '--bottle-r': '12deg',
                '--bottle-x': '-25%',
                duration: .15
            }, {
                '--cart-x': '-16px',
                '--bottle-r': '-12deg',
                '--bottle-x': '-50%',
                duration: .2,
                onStart() {
                    drops(button, 5, -130, -100);
                },
            }, {
                '--cart-x': '92px',
                '--cart-r': '-20deg',
                duration: .4,
                onStart() {
                    button.classList.add('clipped')
                },
                onComplete() {
                    set(button, {
                        '--cart-x': '-120px',
                        '--cart-s': .8,
                        '--cart-y': '-2px',
                        '--bottle-o': 0,
                        '--text-x': '2px'
                    })
                }
            }, {
                '--cart-x': '-57px',
                '--cart-r': '0deg',
                '--check-s': 0,
                duration: .3,
                delay: .1,
                clearProps: true,
                onStart() {
                    to(button, {
                        '--text-x': '10px',
                        '--text-o': 1,
                        duration: .2,
                        delay: .1
                    })
                },
                onComplete() {
                    button.classList.remove('active', 'clipped')
                }
            }]
        })
    })
})

function drops(parent, quantity, minAngle, maxAngle) {
    for(let i = quantity - 1; i >= 0; i--) {
        let angle = gsap.utils.random(minAngle, maxAngle),
            velocity = gsap.utils.random(60, 80)

        let div = document.createElement('div')
        div.classList.add('drop')

        parent.appendChild(div);

        set(div, {
            opacity: 1,
            scale: 0,
        });
        timeline({
            onComplete() {
                div.remove();
            }
        }).to(div, {
            duration: .4,
            scale: gsap.utils.random(.5, .7)
        }, 0).to(div, {
            duration: 1,
            physics2D: {
                angle: angle,
                velocity: velocity,
                gravity: 80
            }
        }, 0).to(div, {
            duration: .3,
            opacity: 0
        }, .3);
    }
}
