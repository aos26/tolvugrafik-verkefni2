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
let count = 0;

let old_time = 0;

let speed = 200;
let dt = 0;

let userDirection = 0;

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
    
    for (let i = 0; i < 4; i++) {
        snakeBody.push(Snake(false));
        //snakeBody.unshift(Snake(false));

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
            case 39:	// niður ör
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
        c = vec4(0.0, 0.0, 1.0, 1.0);
    }
    return {
        pos: {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        },
        speed: 0.05,
        size: 0.5,
        color: c,
        head: head, // True ef haus, false annars
        dir: 0, // Í hvaða átt er snákurinn að fara.
    };
}

function drawSnake(mv, snake, i) {
    mv = mult(mv, translate(snake.pos.x, snake.pos.y, snake.pos.z));
    /*/console.log(snake)
    switch (snake.dir) {
        case 0: // Niður
            mv = mult(mv, translate(snake.pos.x, snake.pos.y, snake.pos.z));
            break;
        case 1: // Upp
            mv = mult(mv, translate(snake.pos.x, snake.pos.y, snake.pos.z));
        case 2: // Vinstri
            mv = mult(mv, translate(snake.pos.x, snake.pos.y, snake.pos.z));
            break;
        case 3: // Hægri
            mv = mult(mv, translate(snake.pos.x, snake.pos.y, snake.pos.z));
        case 4: // Áfram
            mv = mult(mv, translate(snake.pos.x, snake.pos.y, snake.pos.z));
            break;
        case 5: // Til baka
            mv = mult(mv, translate(snake.pos.x, snake.pos.y, snake.pos.z));
        default:
            break;
            
    }
    */
    mv = mult(mv, scalem(snake.size, snake.size, snake.size));

    gl.uniform4fv(colorLoc, snake.color);
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.TRIANGLES, 0, NumVerticesSnake);//NumVerticesSnake);
}

function updateSnake(snakeHead, snakeTail) {
    snakeTail.pos = snakeHead.pos;
}

function moveSnake(snake, direction) {
    snake.dir = direction;

    switch (direction) {
        case 0: // Niður
            snake.pos = {
                x: snake.pos.x,
                y: snake.pos.y - snake.speed,
                z: snake.pos.z,
            };
            break;
        case 1: // Upp
            snake.pos = {
                x: snake.pos.x + snake.speed,
                y: snake.pos.y + snake.speed,
                z: snake.pos.z,
            };
        case 2: // Hægri 
            snake.pos = {
                x: snake.pos.x - snake.speed,
                y: snake.pos.y,
                z: snake.pos.z,
            };
            break;
        case 3: // Vinstri
            snake.pos = {
                x: snake.pos.x + snake.speed,
                y: snake.pos.y,
                z: snake.pos.z,
            };
        case 4: // Áfram
            snake.pos = {
                x: snake.pos.x,
                y: snake.pos.y,
                z: snake.pos.z - snake.speed,
            };
            break;
        case 5: // Til baka
            snake.pos = {
                x: snake.pos.x,
                y: snake.pos.y,
                z: snake.pos.z + snake.speed,
            };
        default:
            break;
    }

}

function render(time) {
    //setTimeout(function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Vinstra auga...
        var mv = lookAt(vec3(0.0, 0.0, zDist),
            vec3(0.0, 0.0, zDist + 2.0),
            vec3(0.0, 1.0, 0.0));
        mv = mult(mv, mult(rotateX(spinX), rotateY(spinY)));

        dt = time - old_time;
        if(Math.abs(dt) >= speed){
            for (let i = snakeBody.length - 1; i > 0; i--) {
                snakeBody[i].pos = snakeBody[i - 1].pos;
                snakeBody[i].dir = snakeBody[i - 1].dir;
            }
            
            moveSnake(snakeBody[0], userDirection);
            old_time = time;
        }
    
        for (let i = 0; i < snakeBody.length; i++) {
            drawSnake(mv, snakeBody[i], i);
        }
        //mv = mult( mv, scalem ( (15), (15), (15) ) );
        // Teikna kassa
        gl.uniform4fv(colorLoc, vec4(0.0, 1.0, 0.0, 1.0));
        gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
        gl.drawArrays(gl.LINES, NumVerticesSnake, NumVerticesBox);


        /*window.requestAnimFrame(render);
    }, 600);*/
    requestAnimFrame(render);
}
