
var WALL_HEIGHT = 128;
var player = {x:(3*64), y:(3 * 64)+32, h:WALL_HEIGHT >> 1, r:270, u:0};

// handy constants
var TO_RADIANS = Math.PI / 180;
var TO_DEGREES = 1 / TO_RADIANS;
var R180 = Math.PI;
var R360 = R180 * 2;

var max_wall_height = 0;

// world specific
var MAP_W = 19, MAP_H = 16;
var MAPCELL_W = 16, MAPCELL_H = 16;
var WORLDCELL_W = 64, WORLDCELL_H = 64;

var tint = [ 0.0, 0.0, 0.0 ];

// render specific
var SCREEN_W = 320, SCREEN_H = 240;
var TEXTURE_H = 128, TEXTURE_W = 64;

var FOV = 60;
var HALF_FOV = FOV >> 1;
var FOV_INC = FOV / SCREEN_W;
var PROJ_PLANE_DIST = (SCREEN_W >> 1) / Math.tan(HALF_FOV * TO_RADIANS);
var PROJ_PLANE_MIDPOINT = SCREEN_H >> 1;

// performance hack
var BUFFER_WIDTH = SCREEN_W;
var BUFFER_WIDTH_BYTES = BUFFER_WIDTH * 4;

var DEBUG_TOGGLE = false;

// globals
var surface, ctx, minimap, mmctx;
var z_buffer = [];

var sprite_hit = false;
var texmap = [];
var keymap = [];
var mouse_x, mouse_y;
var transparent_textures = [];
var keyblock = [];
var tmpImageData;

var tex_anim_counter = 0;
var tex_frame = 0;
var moving_backwards = false;
var collected_key = false;

var sprites = [
  /*
    {grid_x: 5  , grid_y: 2, texture_id: 22, dist:0, angle:0, visible:true, fixed:true},
    {grid_x: 14 , grid_y: 2, texture_id: 20, dist:0, angle:0, visible:true, fixed:true},
    {grid_x: 14 , grid_y: 4, texture_id: 20, dist:0, angle:0, visible:true, fixed:true},
    {grid_x: 5  , grid_y: 5, texture_id: 22, dist:0, angle:0, visible:true, fixed:true},
    */
    {grid_x: 10 , grid_y: 10, texture_id: 4, dist:0, angle:0, visible:true, fixed:true, clickable:true},
    {x: 6*64, y: 11*64 + 32, texture_id: 5, dist:0, angle:0, visible:true, fixed:false, health: 5, hit_count:0, tint: 0}
  ];

var map = [
  [1, 1, 1 , 1 , 1, 1 , 1 , 1, 1, 1, 1, 1, 1, 1, 1, 1 , 1, 1, 1] ,
  [1, 0, 0 , 0 , 0, 1 , 0 , 0, 0, 0, 0, 0, 0, 0, 1, 1 , 0, 0, 1] ,
  [1, 0, 0 , 0 , 0, 0 , 0 , 0, 0, 0, 0, 0, 0, 0, 0, 1 , 0, 0, 19],
  [1, 0, 0 , 0 , 0, 0, 0 , 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 11],
  [1, 0, 0 , 0 , 0, 0, 0 , 0, 0, 0, 0, 0, 0, 0, 0, 1 , 0, 0, 19],
  [1, 0, 0 , 0 , 0, 0 , 0 , 0, 0, 0, 0, 0, 0, 0, 0, 1 , 1, 1, 1] ,
  [1, 0, 0 , 0 , 0, 1 , 0 , 0, 0, 0, 0, 0, 0, 0, 0, 1 , 0, 0, 0] ,
  [1, 0, 0 , 0 , 0, 1 , 0 , 0, 0, 0, 0, 0, 0, 0, 0, 1 , 0, 0, 0] ,
  [1, 1, 1, 1, 1, 1 , 1 , 1, 0, 0, 0, 0, 0, 0, 0, 1 , 0, 0, 0] ,
  [1, 0, 0 , 0 , 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1 , 0, 0, 0] ,
  [1, 0, 0 , 0 , 0, 0 , 0 , 1, 0, 0, 0, 0, 0, 0, 0, 1 , 0, 0, 0] ,
  [1, 0, 0 , 0 , 0, 0 , 0 , 2, 0, 0, 0, 0, 0, 0, 0, 1 , 0, 0, 0] ,
  [1, 0, 0 , 0 , 0, 0 , 0 , 1, 0, 0, 0, 0, 0, 0, 0, 1 , 0, 0, 0] ,
  [1, 0, 0 , 0 , 0, 0 , 0 , 1, 0, 0, 0, 0, 0, 0, 0, 1 , 0, 0, 0] ,
  [1, 0, 0 , 0 , 0, 0 , 0 , 1, 0, 0, 0, 0, 0, 0, 0, 1 , 0, 0, 0] ,
  [1, 1, 1 , 1 , 1, 1 , 1 , 1, 1, 1, 1, 1, 1, 1, 1, 1 , 0, 0, 0]
];

// Init

function loaded() {
  document.addEventListener("keydown", function(e) { /*console.log(e.keyCode);*/ keymap[e.keyCode] = true; }, true );
  document.addEventListener("keyup", function(e) { keymap[e.keyCode] = false; keyblock[e.keyCode] = false; }, true );

  player.tx = player.x;
  player.ty = player.y;
  player.tr = player.r;
  player.tu = player.u;

  surface = document.getElementById("surface");
  surface.width = SCREEN_W;
  surface.height = SCREEN_H;
  surface.style.width = "640px";
  surface.style.height = "480px";
  ctx = surface.getContext("2d");

  tmpImageData = ctx.createImageData(BUFFER_WIDTH, SCREEN_H);

  for(var n = 0 ; n < tmpImageData.data.length ; n++ ) {
    tmpImageData.data[n] = 255;
  }

  for(var i = 1 ; i <= 5 ; i++ ) {
    loadtexture("wall" + i, i);
  }

  loop();
  setInterval( loop, 1000 / 60 );
}

function loadtexture(id, idx) {
  var texture = document.getElementById(id);
  texmap[idx] = new Array(TEXTURE_H);

  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.drawImage(texture, 0, 0);

  var texdata = ctx.getImageData(0, 0, TEXTURE_W, TEXTURE_H);

  for(var y = 0 ; y < TEXTURE_H ; y++ ) {
    texmap[idx][y] = new Array(TEXTURE_W);
    for(var x = 0 ; x < TEXTURE_W ; x++ ) {
      texmap[idx][y][x] = [texdata.data[y*256+(x*4)], texdata.data[y*256+(x*4)+1], texdata.data[y*256+(x*4)+2], texdata.data[y*256+(x*4)+3]];
    }
  }
}

function loop() {
  if( keymap[65] ) {
    if(moving_backward)
      player.tr -= 4;
    else
      player.tr += 4;
  }

  if( keymap[68] ) {
    if(moving_backward)
      player.tr += 4;
    else
      player.tr -= 4;
  }

  if( keymap[87]) {
    move_forward();
    moving_backward = false;
  }

  if( keymap[80]) {
    console.log( player.x, player.y, player.r );
  }

  if( keymap[83]) {
    move_backward();
    moving_backward = false;
  }

  if( keymap[32] && !keyblock[32] ) {
    if( collected_key ) {
      map[11][7] = 0;
    }

    for( var i = sprites.length - 1 ; i >= 0 ; i-- ) {
      if( !sprites[i].fixed ) {
        if( sprites[i].dist < 150 ) {
          keyblock[32] = true;

          sprites[i].health--;
          sprites[i].hit_count = 10;
          if( sprites[i].health <= 0 ) {
            sprites.splice(i, 1);
          }
        }
      }
    }
  }

  tex_anim_counter++;

  if( tex_anim_counter % 2 === 0 ) {
    tex_frame++;
    if( tex_frame > 3 ) {
      tex_frame = 0;
    }
  }

  if( Math.abs(player.r - player.tr) < 0.0001 ) {
    player.r = player.tr;
  }

  if( Math.abs(player.tx - player.x) < 0.001 ) {
    moving_backward = false;
    player.x = player.tx;
  }

  if( Math.abs(player.ty - player.y) < 0.001 ) {
    moving_backward = false;
    player.y = player.ty;
  }

  var diffx = player.tx - player.x;
  var diffy = player.ty - player.y;
  var diffr = player.tr - player.r;
  var diffu = player.tu - player.u;

  diffx *= 0.30;
  diffy *= 0.30;
  diffr *= 0.30;
  diffu *= 0.70;

  player.x += diffx;
  player.y += diffy;
  player.r += diffr;
  player.u += diffu;

  PROJ_PLANE_MIDPOINT = (SCREEN_H / 2.0 + player.u)|0;

  var player_grid_x = (player.x / WORLDCELL_W)|0;
  var player_grid_y = (player.y / WORLDCELL_H)|0;

  var wall_type = map[player_grid_y][player_grid_x];
  if(( wall_type !== 0 && wall_type !== 14 )) {
    player.x -= diffx;
    player.y -= diffy;
    player.tx = player.x;
    player.ty = player.y;
  }

  if( sprite_hit ) {
    player.x -= 5 * diffx;
    player.y -= 5 * diffy;
    player.tx = player.x;
    player.ty = player.y;
  }

  if( player.r > 360 ) {
    player.r -= 360;
    player.tr -= 360;
  }

  if( player.r < 0 ) {
    player.r = 360 + player.r;
    player.tr = 360 + player.tr;
  }

  render();

  for( var i = 0 ; i < 3 ; i++ ) {
    if( tint[i] > 0 ) {
      tint[i] -= 0.2;
    } else {
      tint[i] = 0;
    }
  }
}

function render() {
  var angle = (player.r + HALF_FOV) % 360;
  var projected_slice_height = 0;
  var transparent_wall;

  var imageData = tmpImageData.data;

  for(var i = 0 ; i < SCREEN_W ; i++ ) {
    transparent_wall = null;

    var ray_data = find_distance_to_wall(angle, false);
    if( ray_data[2] == -1 ) {
      continue;
    }

    if( transparent_textures[ray_data[2]] ) {
      transparent_wall = ray_data;
      ray_data = find_distance_to_wall(angle, true);
    }

    if( ray_data[2] == 14 ) {
      ray_data[2] += tex_frame;
    }

    var distance_to_wall = ray_data[0];
    var angle_relative_to_viewing_angle = angle - player.r;
    var corrected_distance = distance_to_wall * Math.cos(angle_relative_to_viewing_angle * TO_RADIANS);

    distance_to_wall = corrected_distance;

    z_buffer[i] = distance_to_wall;

    projected_slice_height = (WALL_HEIGHT / distance_to_wall * PROJ_PLANE_DIST)|0;
    draw_slice(imageData, i, (PROJ_PLANE_MIDPOINT) - (projected_slice_height >> 1), projected_slice_height, ray_data[1]|0, ray_data[2], angle, corrected_distance, ray_data[3] );

    // scp
    /*
    if( transparent_wall !== null ) {
      ray_data = transparent_wall;
      var distance_to_wall = ray_data[0];
      var angle_relative_to_viewing_angle = angle - player.r;
      var corrected_distance = distance_to_wall * Math.cos(angle_relative_to_viewing_angle * TO_RADIANS);

      distance_to_wall = corrected_distance;

      projected_slice_height = WALL_HEIGHT / distance_to_wall * PROJ_PLANE_DIST;
      draw_slice(imageData, i, (PROJ_PLANE_MIDPOINT) - (projected_slice_height >> 1), projected_slice_height, ray_data[1]|0, ray_data[2], angle, corrected_distance, ray_data[3] );
    }
    // ecp
    */

    angle -= FOV_INC;
    if(angle <= 0)
      angle = 360-angle;
  }

  ctx.putImageData(tmpImageData, 0, 0);

  updateSprites();
  sprites.sort( function(a,b) { return b.dist - a.dist; } );

  var sprites_drawn = 0;
  for( i = 0 ; i < sprites.length ; i++ ) {
    if( sprites[i].visible ) {
      drawSprite(sprites[i]);
      sprites_drawn++;
    }
  }
}

function updateSprites() {
  var vx = Math.cos(player.r * TO_RADIANS);
  var vy = Math.sin(player.r * TO_RADIANS);

  sprite_hit = false;

  for( var i = sprites.length - 1 ; i >= 0; i-- ) {
    var sprite = sprites[i];

    var sx, sy;

    if( sprite.fixed ) {
      sx = sprite.grid_x * WORLDCELL_W + (WORLDCELL_W >> 1);
      sy = sprite.grid_y * WORLDCELL_H + (WORLDCELL_H >> 1);
    } else {
      sx = sprite.x;
      sy = sprite.y;

      if( sprite.hit_count > 0 ) {
        sprites[i].hit_count--;
      }
    }

    var px = sx - player.x;
    var py = player.y - sy;

    var distance_to_sprite = Math.sqrt(px*px + py*py);

    if( distance_to_sprite < 80 && sprite.clickable ) {
      sprites.splice(i, 1);
      tint[0] = 1.0;
      tint[1] = 1.0;
      tint[2] = 3.0;
      collected_key = true;
      continue;
    }

    if( distance_to_sprite < 80 && !sprite.fixed ) {
      sprite_hit = true;
      if( tint[0] < 0.5 ) {
        tint[0] = 0.8;
        tint[1] = 0.1;
        tint[2] = 0.1;
      }
    }

    var upx = px / distance_to_sprite;
    var upy = py / distance_to_sprite;

    var cos_theta = upx*vx + upy*vy;

    if( (Math.acos(cos_theta) * TO_DEGREES) > (HALF_FOV + 5) ) {
      sprite.visible = false;
      continue;
    }

    sprite.visible = true;

    var theta = Math.atan2(py, px);
    var angle_relative_to_viewing_angle = theta - (player.r * TO_RADIANS);

    var corrected_distance_to_sprite = distance_to_sprite * Math.cos(angle_relative_to_viewing_angle);

    sprite.dist = corrected_distance_to_sprite;
    sprite.angle = angle_relative_to_viewing_angle;
  }
}

function drawSprite(sprite) {
  var SPRITE_H;
  var SPRITE_W;

  var texture_id = sprite.texture_id;
  var corrected_distance_to_sprite = sprite.dist;
  var angle_relative_to_viewing_angle = sprite.angle;
  var ground_offset = 0;

  if( texture_id == 4 ) {
    SPRITE_W = 28;
    SPRITE_H = 31;
  }

  if( texture_id == 5 ) {
    SPRITE_W = 50;
    SPRITE_H = 49;
    ground_offset = 30 - 5 * Math.sin(tex_anim_counter / 10);
  }

  if( texture_id == 25 ) {
    SPRITE_H = 25;
    SPRITE_W = 25;

    texture_id += (tex_anim_counter % 8) >> 1;
  }

  if( corrected_distance_to_sprite < (WORLDCELL_W) ) {
    return;
  }

  var sprite_height = (SPRITE_H / corrected_distance_to_sprite * PROJ_PLANE_DIST)|0;
  var sprite_width = (SPRITE_W / corrected_distance_to_sprite * PROJ_PLANE_DIST)|0;

  var sprite_offset = ((((WALL_HEIGHT - SPRITE_H) >> 1) - ground_offset) / corrected_distance_to_sprite * PROJ_PLANE_DIST)|0;

  var centre_of_sprite_intersection = (SCREEN_W >> 1) - (Math.tan(angle_relative_to_viewing_angle) * PROJ_PLANE_DIST);

  var left_of_sprite_intersection = Math.round(centre_of_sprite_intersection - (sprite_width / 2));
  var right_of_sprite_intersection = (centre_of_sprite_intersection + (sprite_width / 2));

  if( right_of_sprite_intersection < 0 || left_of_sprite_intersection >= SCREEN_W ) {
    return;
  }

  var visible_sprite_width = sprite_width;
  var visible_sprite_height = sprite_height;
  var sprite_draw_xofs = 0;

  if( left_of_sprite_intersection + sprite_width >= SCREEN_W )
    visible_sprite_width = SCREEN_W - left_of_sprite_intersection;

  if( left_of_sprite_intersection < 0 ) {
    sprite_draw_xofs = -left_of_sprite_intersection;
    left_of_sprite_intersection = 0;
  }

  var ofs, current_row, start_row, xofs, yofs;

  var sprite_inc_x = (SPRITE_W - 1) / sprite_width;
  var sprite_inc_y = (SPRITE_H - 1) / sprite_height;
  xofs = 0;
  yofs = 0;
  start_row = (SCREEN_H >> 1) - (sprite_height >> 1);

  if( start_row + sprite_offset > SCREEN_H ) {
    return;
  }

  if( (start_row + sprite_offset + sprite_height) >= SCREEN_H ) {
    visible_sprite_height = SCREEN_H - sprite_offset - start_row;
  }

  if( visible_sprite_height === 0 ) {
    return;
  }

  imageData = ctx.getImageData(left_of_sprite_intersection, start_row + sprite_offset, visible_sprite_width, visible_sprite_height);

  data = imageData.data;

  ofs = 0;

  for( var i = 0 ; i < sprite_height ; i++ ) {
    yofs = Math.round(i * sprite_inc_y);
    for( var j = 0 ; j < visible_sprite_width ; j++ ) {
      xofs = Math.round((j + sprite_draw_xofs) * sprite_inc_x);
      if( (z_buffer[left_of_sprite_intersection + j] > corrected_distance_to_sprite) && (texmap[texture_id][yofs][xofs][3] === 255)) {
        r = texmap[texture_id][yofs][xofs][0];
        g = texmap[texture_id][yofs][xofs][1];
        b = texmap[texture_id][yofs][xofs][2];

        if( sprite.hit_count > 0 ) {
          r <<= 1;
          g >>= 2;
          b >>= 2;
        }
        data[ofs++] = r;
        data[ofs++] = g;
        data[ofs++] = b;
        data[ofs++] = texmap[texture_id][yofs][xofs][3];
      } else {
        ofs += 4;
      }
    }
  }

  ctx.putImageData(imageData, left_of_sprite_intersection, start_row + sprite_offset);
}

// User input stuff

function move_forward() {
  var angle = player.r % 360;

  var unitvx = 1, unitvy = 0;
  unitvx = 10 * Math.cos(angle * TO_RADIANS);
  unitvy = -10 * Math.sin(angle * TO_RADIANS);

  player.tx += unitvx;
  player.ty += unitvy;

}

function move_backward() {
  var angle = player.r % 360;

  var unitvx = 1, unitvy = 0;
  unitvx = 10 * Math.cos(angle * TO_RADIANS);
  unitvy = 10 * Math.sin(angle * TO_RADIANS);

  unitvx *= -1;
  unitvy *= -1;

  player.tx += unitvx;
  player.ty -= unitvy;
}

// Render calculation

function find_distance_to_wall(angle, ignore_transparent) {

  var rang = angle * TO_RADIANS;
  var ray_facing_up = angle >= 0 && angle <= 180;
  var ray_facing_left = angle >= 90 && angle <= 270;
  var TanR = Math.tan(rang), CosR = Math.cos(rang), SinR = Math.sin(rang);

  var nb_y = 0;
  var dy = 0;

  // Horizontal intersection checks

  if( ray_facing_up ) {
    nb_y = ((player.y / WORLDCELL_H)|0) * WORLDCELL_H - 1;
    dy = -WORLDCELL_H;
  } else {
    dy = WORLDCELL_H;
    nb_y = ((player.y / WORLDCELL_H)|0) * WORLDCELL_H + WORLDCELL_H;
  }

  var dx = WORLDCELL_H / TanR;

  if(ray_facing_left) {
    dx = -Math.abs(dx);
  } else {
    dx = Math.abs(dx);
  }

  var nb_x = player.x + (player.y - nb_y) / TanR;

  var minimum_distance = Number.MAX_VALUE;

  var texture_offset = -1;
  var texture_id = -1;
  var distance = 0;

  var grid_x = (nb_x / WORLDCELL_W)|0;
  var grid_y = (nb_y / WORLDCELL_H)|0;

  var side_on = false;

  if((grid_x >= 0 && grid_x < MAP_W) && (grid_y >= 0 && grid_y < MAP_H)) {
    do {
      if( map[grid_y][grid_x] > 0 && !(ignore_transparent && transparent_textures[map[grid_y][grid_x]]) ) {
        distance = Math.abs((nb_y - player.y) / SinR);
        if(distance < minimum_distance) {

          // Store ray intersection point and texturemap offset
          minimum_distance = distance;
          texture_offset = nb_x % TEXTURE_W;

          // Ensure correct texture column for backwards rays
          if( grid_y > (player.y / WORLDCELL_H) ) {
            texture_offset = (TEXTURE_W - 1) - texture_offset;
          }

          texture_id = map[grid_y][grid_x];
        }

        break;
      }

      nb_x += dx;
      nb_y += dy;
      grid_x = (nb_x / WORLDCELL_W)|0;
      grid_y = (nb_y / WORLDCELL_H)|0;
    }
    while((nb_x >= 0 && nb_x < (WORLDCELL_W * MAP_W)) && (nb_y >= 0 && nb_y < (WORLDCELL_H * MAP_H)));
  }

  // Vertical intersection checks

  if(ray_facing_left) {
    nb_x = ((player.x / WORLDCELL_W)|0) * WORLDCELL_W - 1;
    dx = -WORLDCELL_W;
  } else {
    nb_x = ((player.x / WORLDCELL_W)|0) * WORLDCELL_W + WORLDCELL_W;
    dx = WORLDCELL_W;
  }

  dy = WORLDCELL_W * TanR;

  if(ray_facing_up) {
    dy = -Math.abs(dy);
  } else {
    dy = Math.abs(dy);
  }

  nb_y = player.y + (player.x - nb_x) * TanR;

  grid_x = (nb_x / WORLDCELL_W)|0;
  grid_y = (nb_y / WORLDCELL_H)|0;

  if((grid_x >= 0 && grid_x < MAP_W) && (grid_y >= 0 && grid_y < MAP_H)) {
    do {
      if( map[grid_y][grid_x] > 0 && !(ignore_transparent && transparent_textures[map[grid_y][grid_x]]) ) {
        distance = Math.abs((nb_x - player.x) / CosR);
        if(distance < minimum_distance) {

          // Store ray intersection point and texturemap offset
          minimum_distance = distance;
          texture_offset = nb_y % TEXTURE_W;

          // Ensure correct texture column for backwards rays
          if( grid_x < (player.x / WORLDCELL_W) ) {
            texture_offset = (TEXTURE_W - 1) - texture_offset;
          }

          texture_id = map[grid_y][grid_x];
        }

        break;
      }

      nb_x += dx;
      nb_y += dy;
      grid_x = (nb_x / WORLDCELL_W)|0;
      grid_y = (nb_y / WORLDCELL_H)|0;
    }
    while((nb_x >= 0 && nb_x < (WORLDCELL_W * MAP_W)) && (nb_y >= 0 && nb_y < (WORLDCELL_H * MAP_H)));
  }

  return [minimum_distance, texture_offset, texture_id, side_on];
}

// Draw the slice to the canvas

function draw_slice(imageData, column_number, y, height, texture_ofs, texture_id, angle, distance_to_wall, side_on) {
  if( texture_id < 0 )
    return;

  var current_row = 0;

  // height of the projection plance
  var iyofs = column_number * 4;
  var texofs = 0;
  var texskip = 0;

  var tofs = TEXTURE_H / height;
  height = height|0;

  if( y > 0 ) {
    current_row = y;
    iyofs += (y * BUFFER_WIDTH_BYTES);
  } else {
    texskip = (-y * tofs);
  }

  var radA = angle * TO_RADIANS;
  var cosA = Math.cos(radA);
  var sinA = Math.sin(radA);
  var cosRMinusA = Math.cos((player.r - angle) * TO_RADIANS);

  var up_row = y - 1;
  var uofs = (up_row * BUFFER_WIDTH_BYTES) + (column_number * 4);

  var pj, ux, uy, vx, vy, xpos, ypos;

  ux = -cosA;
  uy = sinA;

  // draw ceiling
  var distance;
  var distance_multiplier = player.h * PROJ_PLANE_DIST / cosRMinusA;

  var r, g, b, cd, m;

  while( up_row >= 0 ) {
    pj = up_row - PROJ_PLANE_MIDPOINT;
    distance = distance_multiplier / pj;

    vx = ux * distance;
    vy = uy * distance;

    xpos = player.x + vx;
    ypos = player.y + vy;

    grid_x = (xpos / 64)|0;
    grid_y = (ypos / 64)|0;

    xpos = (xpos|0) % 64;
    ypos = (ypos|0) % 64;

    r = texmap[3][ypos][xpos][0];
    g = texmap[3][ypos][xpos][1];
    b = texmap[3][ypos][xpos][2];

    r += (r * tint[0]);
    g += (g * tint[1]);
    b += (b * tint[2]);

    imageData[uofs] = r;
    imageData[uofs+1] = g;
    imageData[uofs+2] = b;
    up_row--;
    uofs -= BUFFER_WIDTH_BYTES;
  }

  // render the wall
  for( var iy = 0 ; iy < height ; iy++ ) {
    // don't render past the end of the viewport
    if( current_row >= SCREEN_H )
      break;

    texofs = (texskip + (tofs * iy)|0);
    r = texmap[texture_id][texofs][texture_ofs][0];
    g = texmap[texture_id][texofs][texture_ofs][1];
    b = texmap[texture_id][texofs][texture_ofs][2];

    if( (r === 0) && (g === 255) && (b === 255) ) {
      iyofs += BUFFER_WIDTH_BYTES;
    } else {
      r += (r * tint[0]);
      g += (g * tint[1]);
      b += (b * tint[2]);

      imageData[iyofs++] = r;
      imageData[iyofs++] = g;
      imageData[iyofs++] = b;
      iyofs++;
      iyofs += (BUFFER_WIDTH_BYTES - 4);
    }
    current_row++;
  }

  // cast a ray to find intersection point with the floor for
  // remaining rows of the projection plane

  // Variable floor test hack
  //var floortex_id = 7, gridx, gridy;

  ux = cosA;
  uy = -sinA;

  while( current_row < SCREEN_H )
    {
      pj = current_row - PROJ_PLANE_MIDPOINT;
      distance = distance_multiplier / pj;

      vx = ux * distance;
      vy = uy * distance;

      xpos = player.x + vx;
      ypos = player.y + vy;

      grid_x = (xpos / 64)|0;
      grid_y = (ypos / 64)|0;

      xpos = (xpos|0) % 64;
      ypos = (ypos|0) % 64;

      r = texmap[1][ypos][xpos][0];
      g = texmap[3][ypos][xpos][1];
      b = texmap[3][ypos][xpos][2];

      r += (r * tint[0]);
      g += (g * tint[1]);
      b += (b * tint[2]);

      imageData[iyofs++] = r;
      imageData[iyofs++] = g;
      imageData[iyofs++] = b;
      iyofs++;
      iyofs += (BUFFER_WIDTH_BYTES - 4);

      current_row++;
    }
}

window["raycaster"] = loaded;
