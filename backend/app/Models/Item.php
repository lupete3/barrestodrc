<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    protected $table = 'pos_items';
    protected $guarded = [];
    public $incrementing = false;
    protected $keyType = 'string';
}
