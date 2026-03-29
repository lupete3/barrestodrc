<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $table = 'pos_orders';
    protected $guarded = [];
    public $incrementing = false;
    protected $keyType = 'string';
    protected $casts = ['items' => 'array'];
}
