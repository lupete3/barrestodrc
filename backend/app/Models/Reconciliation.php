<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reconciliation extends Model
{
    protected $table = 'pos_reconciliations';
    protected $guarded = [];
    public $incrementing = false;
    protected $keyType = 'string';
}
