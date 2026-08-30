<?php
namespace App\Http\Controllers;
use App\Models\Delivery;
use App\Services\DeliverySchedulingService;
use Illuminate\Http\Request;

class DeliveryController extends Controller {
    public function schedule(Request $request, DeliverySchedulingService $service) { $data=$request->validate(['service_date'=>'required|date']); $date=\Carbon\Carbon::parse($data['service_date']); abort_if($date->isPast()||$date->gt(now()->addDays(90)),422,'Service date outside dispatch horizon.'); $service->schedule($date); return back(); }
    public function assign(Request $request, Delivery $delivery, DeliverySchedulingService $service) { $data=$request->validate(['vehicle_id'=>'required|exists:vehicles,id','officer_id'=>'required|exists:users,id','lines'=>'required|array','lines.*'=>'numeric']); $service->assign($delivery,$data['vehicle_id'],$data['officer_id'],$data['lines']); return back(); }
}
