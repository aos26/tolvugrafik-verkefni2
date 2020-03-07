/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Wíragrindarteningur teiknaður tvisvar frá mismunandi
//     sjónarhorni til að fá víðsjónaráhrif (með gleraugum)
//
//    Hjálmtýr Hafsteinsson, febrúar 2020
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

var NumVertices = 24;

var points = [];
var colors = [];

var pointsSnake = [];
var colorsSnake = [];
var drawCounter = 1;
var timeInDir = 10;
var timeToGrow = 50;
var movesTillGrowth = 0;

var vBuffer;
var vPosition;

var movement = false;     // Do we rotate?
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var zDist = -5.0;
var eyesep = 0.2;

var proLoc;
var mvLoc;

let snakeBody = [];

var v = [
    vec3(-1.0, -1.0, 1.0),
    vec3(-1.0, 1.0, 1.0),
    vec3(1.0, 1.0, 1.0),
    vec3(1.0, -1.0, 1.0),
    vec3(-1.0, -1.0, -1.0),
    vec3(-1.0, 1.0, -1.0),
    vec3(1.0, 1.0, -1.0),
    vec3(1.0, -1.0, -1.0)
];

var lines = [v[0], v[1], v[1], v[2], v[2], v[3], v[3], v[0],
v[4], v[5], v[5], v[6], v[6], v[7], v[7], v[4],
v[0], v[4], v[1], v[5], v[2], v[6], v[3], v[7]
];

var vertices = [];

var NumVerticesSnake = 0;
var NumVerticesBox = lines.length;
let countMoves = 0;

let old_time = 0;

let speed = 200;
let dt = 0;

let userDirection = 0;
let prevDirection = 0;

let isGameOver = false;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    colorCube();

    vertices = pointsSnake.concat(lines);

    NumVerticesSnake = pointsSnake.length;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    colorLoc = gl.getUniformLocation(program, "wireColor");

    proLoc = gl.getUniformLocation(program, "projection");
    mvLoc = gl.getUniformLocation(program, "modelview");

    var proj = perspective(50.0, 1.0, 0.2, 100.0);
    gl.uniformMatrix4fv(proLoc, false, flatten(proj));

    snakeBody.push(Snake(true));
    
    for (let i = 0; i < 5; i++) {
        snakeBody.push(Snake(false));
        //snakeBody.unshift(Snake(false));

    }

    document.getElementById("slider").onchange = function(event) {
        timeInDir = event.target.value;
    }
    document.getElementById("slider").onchange = function(event) {
        movesTillGrowth = event.target.value;
    }

    //snakeBody.reverse();
    //console.log(snakeBody)

    //event listeners for mouse
    canvas.addEventListener("mousedown", function (e) {
        movement = true;
        origX = e.offsetX;
        origY = e.offsetY;
        e.preventDefault();         // Disable drag and drop
    });

    canvas.addEventListener("mouseup", function (e) {
        movement = false;
    });

    canvas.addEventListener("mousemove", function (e) {
        if (movement) {
            spinY = (spinY + (origX - e.offsetX)) % 360;
            spinX = (spinX + (e.offsetY - origY)) % 360;
            origX = e.offsetX;
            origY = e.offsetY;
        }
    });

    // Event listener for keyboard
    window.addEventListener("keydown", function (e) {
        switch (e.keyCode) {
            case 38:	// upp ör
                userDirection = 1;
                break;
            case 40:	// niður ör
                userDirection = 0;
                break;
            case 37:	// vinstri ör
                userDirection = 3;
                break;
            case 39:	// hægri ör
                userDirection = 2;
                break;
            case 83:	// s
                userDirection = 4;
                break;
            case 87:	// w
                userDirection = 5;
                break;
            
        }
    });

    // Event listener for mousewheel
    window.addEventListener("mousewheel", function (e) {
        if (e.wheelDelta > 0.0) {
            zDist += 0.1;
        } else {
            zDist -= 0.1;
        }
    });

    render(0);
}

/*
function drawFrame(mv, snake) {
    mv = mult(mv, translate(snake.pos.x * 2 - 5, snake.pos.y * 2 - 19, snake.pos.z * 2 - 5));
    // white frame arond the block
    gl.uniform4fv(colorLoc, vec4(0.5, 0.5, 0.5, 1.0));
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.LINE_STRIP, Numfill, Numframe);
  }
  */

function colorCube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
}

function quad(a, b, c, d) {
    var vertices = [
        vec3(-0.1, -0.1, 0.1),
        vec3(-0.1, 0.1, 0.1),
        vec3(0.1, 0.1, 0.1),
        vec3(0.1, -0.1, 0.1),
        vec3(-0.1, -0.1, -0.1),
        vec3(-0.1, 0.1, -0.1),
        vec3(0.1, 0.1, -0.1),
        vec3(0.1, -0.1, -0.1)
    ];

    var vertexColors = [
        [0.0, 0.0, 0.0, 1.0],  // black
        [1.0, 0.0, 0.0, 1.0],  // red
        [1.0, 1.0, 0.0, 1.0],  // yellow
        [0.0, 1.0, 0.0, 1.0],  // green
        [0.0, 0.0, 1.0, 1.0],  // blue
        [1.0, 0.0, 1.0, 1.0],  // magenta
        [0.0, 1.0, 1.0, 1.0],  // cyan
        [1.0, 1.0, 1.0, 1.0]   // white
    ];

    // We need to parition the quad into two triangles in order for
    // WebGL to be able to render it.  In this case, we create two
    // triangles from the quad indices

    //vertex color assigned by the index of the vertex

    var indices = [a, b, c, a, c, d];

    for (var i = 0; i < indices.length; ++i) {
        pointsSnake.push(vertices[indices[i]]);
        //colors.push( vertexColors[indices[i]] );

        // for solid colored faces use 
        colorsSnake.push(vertexColors[a]);

    }
}

/**
 * 
 * @param {boolean} head Segir til hvort það sé haus eða ekki.
 * Dir:
 *      0 - Niður -y
 *      1 - Upp +y
 *      2 - Hægri -x
 *      3 - Vinstri +x
 *      4 - Áfram -z Í átt að notanda
 *      5 - Til baka +z
 */
function Snake(head) {
    let c = vec4(1.0, 0.0, 0.0, 1.0);
    if (head) {
        c = vec4(1.0, 1.0, 0.0, 1.0);
    }
    return {
        pos: {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        },
        speed: 0.125,
        size: 0.5,
        color: c,
        head: head, // True ef haus, false annars
    };
}

function drawSnake(mv, snake, i) {
    mv = mult(mv, translate(snake.pos.x, snake.pos.y, snake.pos.z));
    mv = mult(mv, scalem(snake.size, snake.size, snake.size));

    gl.uniform4fv(colorLoc, snake.color);
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.TRIANGLES, 0, NumVerticesSnake);
}


function moveSnake(snake, direction) {

    switch (direction) {
        case 0: // Niður
            //console.log(snake.pos);
            snake.pos = {
                x: snake.pos.x,
                y: snake.pos.y - snake.speed,
                z: snake.pos.z,
            };
            if(snake.pos.y <= -1.0){
                snake.pos = {
                    x: snake.pos.x,
                    y: 0.9 + snake.speed,
                    z: snake.pos.z,
                }
            }
            break;
        case 1: // Upp
            snake.pos = {
                x: snake.pos.x + snake.speed,
                y: snake.pos.y + snake.speed,
                z: snake.pos.z,
            };
            if(snake.pos.y >= 1.0){
                snake.pos = {
                    x: snake.pos.x,
                    y: -0.9 - snake.speed,
                    z: snake.pos.z,
                }
            }
            
        case 2: // Hægri 
            
            snake.pos = {
                x: snake.pos.x - snake.speed,
                y: snake.pos.y,
                z: snake.pos.z,
            };
            if(snake.pos.x <= -1.0){
                snake.pos = {
                    x: 0.9 + snake.speed,
                    y: snake.pos.y,
                    z: snake.pos.z,
                }
            }
            break;
        case 3: // Vinstri            
            snake.pos = {
                x: snake.pos.x + snake.speed,
                y: snake.pos.y,
                z: snake.pos.z,
            };
            if(snake.pos.x >= 1.0){
                snake.pos = {
                    x: -0.9 - snake.speed,
                    y: snake.pos.y,
                    z: snake.pos.z,
                }
            }
            break;

        case 4: // Áfram
            snake.pos = {
                x: snake.pos.x,
                y: snake.pos.y,
                z: snake.pos.z - snake.speed,
            };
            if(snake.pos.z <= -1.0){
                snake.pos = {
                    x: snake.pos.x,
                    y: snake.pos.y,
                    z: 0.9 + snake.speed,
                }
            }
            break;
        case 5: // Til baka

            snake.pos = {
                x: snake.pos.x,
                y: snake.pos.y,
                z: snake.pos.z + snake.speed,
            };
            if(snake.pos.z >= 1.0){
                snake.pos = {
                    x: snake.pos.x,
                    y: snake.pos.y,
                    z: -0.9 - snake.speed,
                }
            }
            break;
        default:
            break;
    }

}

function checkCollision(snake) {
    let collision = false;
    for (let i = 1; i < snakeBody.length; i++) {
        if (calcDist(snake, snakeBody[i]) ) {
            collision = true;
            return collision;
        }
    }
    return collision;

}

function calcDist(snakeHead, snake) {
    let x = Math.abs(snakeHead.pos.x - snake.pos.x);
    let y = Math.abs(snakeHead.pos.y - snake.pos.y);
    let z = Math.abs(snakeHead.pos.z - snake.pos.z);

    if (x <= 0.01 && y <= 0.01 && z <= 0.01) {
        return true;
    } else {
        return false;
    }

}

function explode() {
    for (let i = 0; i < snakeBody.length; i++) {
        snakeBody[i].color = vec4(Math.random(),Math.random(),Math.random(), 1.0);
        snakeBody[i].speed = getRandomNum(0.3, 0.01);
        snakeBody[i].pos = {
            x: snakeBody[i].pos.x - snakeBody[i].speed,
            y: snakeBody[i].pos.y - snakeBody[i].speed,
            z: snakeBody[i].pos.z + snakeBody[i].speed,
        }
    }
}
function gameOver() {
    for (let i = 0; i < snakeBody.length; i++) {
        snakeBody[i].speed = 0;
    }
    isGameOver = true;
}

function getRandomNum(MAX, MIN) {
    return Math.random()*(MAX - MIN) + MIN;
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

function render(time) {
    //setTimeout(function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Vinstra auga...
        var mv = lookAt(vec3(0.0, 0.0, zDist),
            vec3(0.0, 0.0, zDist + 2.0),
            vec3(0.0, 1.0, 0.0));
        mv = mult(mv, mult(rotateX(spinX), rotateY(spinY)));
        if (!isGameOver) {
            
        dt = time - old_time;
        if(Math.abs(dt) >= speed){
            for (let i = snakeBody.length - 1; i > 0; i--) {
                snakeBody[i].pos = snakeBody[i - 1].pos;
            }
            
            /*if (countMoves == timeInDir) {
                console.log(timeInDir);
                prevDirection = userDirection;
                userDirection = getRandomInt(6);

                while (prevDirection < userDirection && prevDirection+1 == userDirection || prevDirection > userDirection && prevDirection-1 == userDirection) {
                    userDirection = getRandomInt(6)
                }  
                countMoves = 0;
            }*/
            moveSnake(snakeBody[0], userDirection);
            if(checkCollision(snakeBody[0])){
                explode();
                gameOver();
            }
            countMoves++;
            movesTillGrowth++;

            old_time = time;
        }

        if(movesTillGrowth >= timeToGrow) {
            snakeBody.push(Snake(false));
            snakeBody[snakeBody.length - 1].pos = snakeBody[snakeBody.length - 2].pos;
            movesTillGrowth = 0;
        }
    
        
    }
    for (let i = 0; i < snakeBody.length; i++) {
        drawSnake(mv, snakeBody[i], i);
        
    }

        
        gl.uniform4fv(colorLoc, vec4(0.0, 1.0, 0.0, 1.0));
        gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
        gl.drawArrays(gl.LINES, NumVerticesSnake, NumVerticesBox);

    requestAnimFrame(render);
}
