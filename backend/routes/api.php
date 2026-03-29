<?php

use App\Http\Controllers\SyncController;
use Illuminate\Support\Facades\Route;

Route::get('/up', function() { return response()->json(['status' => 'ok']); });
Route::get('/sync/pull', [SyncController::class, 'pull']);
Route::post('/sync/push', [SyncController::class, 'push']);
Route::get('/sync/reset-admin', [SyncController::class, 'resetAdmin']);
