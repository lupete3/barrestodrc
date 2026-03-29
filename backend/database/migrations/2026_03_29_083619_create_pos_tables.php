<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pos_categories', function (Blueprint $table) {
            $table->string('id')->primary(); // Slug/ID used in React
            $table->string('name');
            $table->string('icon')->default('📌');
            $table->timestamps();
        });

        Schema::create('pos_items', function (Blueprint $table) {
            $table->string('id')->primary(); // Slug/UUID used in React
            $table->string('name');
            $table->string('category_id');
            $table->decimal('price', 15, 2);
            $table->string('image')->nullable();
            $table->timestamps();
            
            $table->foreign('category_id')->references('id')->on('pos_categories')->onDelete('cascade');
        });

        Schema::create('staff_users', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('role');
            $table->string('pin_code');
            $table->timestamps();
        });

        Schema::create('pos_orders', function (Blueprint $table) {
            $table->string('id')->primary(); // ORD-XXX
            $table->string('server_name');
            $table->json('items');
            $table->decimal('total', 15, 2);
            $table->decimal('tax', 15, 2)->default(0);
            $table->dateTime('timestamp');
            $table->timestamps();
        });

        Schema::create('pos_expenses', function (Blueprint $table) {
            $table->string('id')->primary(); // EXP-XXX
            $table->date('date');
            $table->string('category');
            $table->text('description');
            $table->decimal('amount', 15, 2);
            $table->dateTime('timestamp');
            $table->timestamps();
        });

        Schema::create('pos_reconciliations', function (Blueprint $table) {
            $table->string('id')->primary(); // REC-XXX
            $table->date('date');
            $table->string('server_name');
            $table->decimal('expected_amount', 15, 2);
            $table->decimal('actual_amount', 15, 2);
            $table->decimal('variance', 15, 2);
            $table->string('manager_name');
            $table->dateTime('timestamp');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_reconciliations');
        Schema::dropIfExists('pos_expenses');
        Schema::dropIfExists('pos_orders');
        Schema::dropIfExists('staff_users');
        Schema::dropIfExists('pos_items');
        Schema::dropIfExists('pos_categories');
    }
};
