<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    protected $table = 'pos_expenses';
    protected $guarded = [];
    public $incrementing = false;
    protected $keyType = 'string';
}
