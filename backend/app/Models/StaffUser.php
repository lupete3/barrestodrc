<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaffUser extends Model
{
    protected $table = 'staff_users';
    protected $guarded = [];
    public $incrementing = false;
    protected $keyType = 'string';
}
