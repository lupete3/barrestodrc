<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Expense;
use App\Models\Reconciliation;
use App\Models\Category;
use App\Models\Item;
use App\Models\StaffUser;
use App\Models\PosSetting;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SyncController extends Controller
{
    private function normalizeTimestamp($isoString)
    {
        if (!$isoString) return null;
        try {
            return Carbon::parse($isoString)->format('Y-m-d H:i:s');
        } catch (\Exception $e) {
            return null;
        }
    }

    private function verifyToken(Request $request)
    {
        $token = $request->bearerToken();
        $expected = env('APP_SYNC_TOKEN', 'secret_token_123');
        
        if ($token !== $expected) {
            Log::warning("Tentative de sync échouée. Token reçu: " . ($token ?? 'NULL'));
            abort(401, 'Unauthorized: Sync Token mismatch. Expected: ' . $expected);
        }
    }

    public function push(Request $request)
    {
        $this->verifyToken($request);
        $data = $request->all();

        // White-lists of allowed database columns
        $orderFields = ['id', 'items', 'total', 'tax', 'timestamp', 'server_name', 'reconciliation_id'];
        $expenseFields = ['id', 'date', 'category', 'description', 'amount', 'timestamp'];
        $reconFields = ['id', 'date', 'server_name', 'expected_amount', 'actual_amount', 'variance', 'manager_name', 'timestamp'];
        $categoryFields = ['id', 'name', 'icon'];
        $itemFields = ['id', 'name', 'category_id', 'price', 'image'];
        $userFields = ['id', 'name', 'role', 'pin_code'];

        try {
            if (isset($data['categories']) && is_array($data['categories'])) {
                foreach ($data['categories'] as $catData) {
                    $filtered = array_intersect_key($catData, array_flip($categoryFields));
                    Category::updateOrCreate(['id' => $catData['id']], $filtered);
                }
            }

            if (isset($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $itemData) {
                    if(isset($itemData['category'])) { $itemData['category_id'] = $itemData['category']; }
                    $filtered = array_intersect_key($itemData, array_flip($itemFields));
                    Item::updateOrCreate(['id' => $itemData['id']], $filtered);
                }
            }

            if (isset($data['users']) && is_array($data['users'])) {
                foreach ($data['users'] as $userData) {
                    if(isset($userData['pin'])) { $userData['pin_code'] = $userData['pin']; }
                    $filtered = array_intersect_key($userData, array_flip($userFields));
                    StaffUser::updateOrCreate(['id' => $userData['id']], $filtered);
                }
            }

            if (isset($data['orders']) && is_array($data['orders'])) {
                foreach ($data['orders'] as $orderData) {
                    $id = $orderData['id'];
                    if(isset($orderData['server'])) { $orderData['server_name'] = $orderData['server']; }
                    if(isset($orderData['reconciliationId'])) { $orderData['reconciliation_id'] = $orderData['reconciliationId']; }
                    if(isset($orderData['timestamp'])) { $orderData['timestamp'] = $this->normalizeTimestamp($orderData['timestamp']); }
                    $filtered = array_intersect_key($orderData, array_flip($orderFields));
                    Order::updateOrCreate(['id' => $id], $filtered);
                }
            }

            if (isset($data['expenses']) && is_array($data['expenses'])) {
                foreach ($data['expenses'] as $expenseData) {
                    $id = $expenseData['id'];
                    if(isset($expenseData['timestamp'])) { $expenseData['timestamp'] = $this->normalizeTimestamp($expenseData['timestamp']); }
                    $filtered = array_intersect_key($expenseData, array_flip($expenseFields));
                    Expense::updateOrCreate(['id' => $id], $filtered);
                }
            }

            if (isset($data['reconciliations']) && is_array($data['reconciliations'])) {
                foreach ($data['reconciliations'] as $reconciliationData) {
                    $id = $reconciliationData['id'];
                    if(isset($reconciliationData['serverName'])) { $reconciliationData['server_name'] = $reconciliationData['serverName']; }
                    if(isset($reconciliationData['expectedAmount'])) { $reconciliationData['expected_amount'] = $reconciliationData['expectedAmount']; }
                    if(isset($reconciliationData['actualAmount'])) { $reconciliationData['actual_amount'] = $reconciliationData['actualAmount']; }
                    if(isset($reconciliationData['managerName'])) { $reconciliationData['manager_name'] = $reconciliationData['managerName']; }
                    if(isset($reconciliationData['timestamp'])) { $reconciliationData['timestamp'] = $this->normalizeTimestamp($reconciliationData['timestamp']); }
                    $filtered = array_intersect_key($reconciliationData, array_flip($reconFields));
                    Reconciliation::updateOrCreate(['id' => $id], $filtered);
                }
            }

            if (isset($data['settings']) && is_array($data['settings'])) {
                foreach ($data['settings'] as $key => $value) {
                    PosSetting::updateOrCreate(['key' => $key], ['value' => is_array($value) ? json_encode($value) : $value]);
                }
            }
        } catch (\Exception $e) {
            Log::error("CRITICAL SYNC ERROR (PUSH): " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Sync failed on server: ' . $e->getMessage()], 500);
        }

        return response()->json(['status' => 'success', 'message' => 'Data synchronized successfully']);
    }

    public function pull(Request $request)
    {
        $this->verifyToken($request);

        $items = Item::all()->map(function($item) {
            $data = $item->toArray();
            $data['category'] = $item->category_id;
            return $data;
        });

        $users = StaffUser::all()->map(function($user) {
            $data = $user->toArray();
            $data['pin'] = $user->pin_code;
            return $data;
        });

        $orders = Order::all()->map(function($order) {
            $data = $order->toArray();
            $data['server'] = $order->server_name; // Map back for React
            $data['reconciliationId'] = $order->reconciliation_id;
            return $data;
        });

        $expenses = Expense::all();

        $reconciliations = Reconciliation::all()->map(function($recon) {
            $data = $recon->toArray();
            $data['serverName'] = $recon->server_name;
            $data['expectedAmount'] = (float)$recon->expected_amount;
            $data['actualAmount'] = (float)$recon->actual_amount;
            $data['managerName'] = $recon->manager_name;
            return $data;
        });

        $settings = PosSetting::all()->pluck('value', 'key')->all();
        // Decode JSON values if needed
        foreach($settings as $key => $val) {
            $decoded = json_decode((string)$val, true);
            if (json_last_error() === JSON_ERROR_NONE && (is_array($decoded) || is_object($decoded))) {
                $settings[$key] = $decoded;
            }
        }

        return response()->json([
            'categories' => Category::all(),
            'items' => $items,
            'users' => $users,
            'orders' => $orders,
            'expenses' => $expenses,
            'reconciliations' => $reconciliations,
            'settings' => $settings
        ]);
    }

    public function resetAdmin()
    {
        // Forcer la création d'un gérant avec le code 1234
        $admin = StaffUser::updateOrCreate(
            ['id' => 'admin1'],
            [
                'name' => 'Administrateur',
                'role' => 'admin',
                'pin_code' => '1234'
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'L\'administrateur a été réinitialisé avec succès sur le serveur.',
            'user' => $admin
        ]);
    }
}
