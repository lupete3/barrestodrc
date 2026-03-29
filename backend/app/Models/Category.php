<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $table = 'pos_categories';
    protected $guarded = [];
    public $incrementing = false;
    protected $keyType = 'string';
}
