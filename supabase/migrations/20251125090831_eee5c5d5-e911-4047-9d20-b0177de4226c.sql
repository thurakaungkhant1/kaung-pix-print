-- Create trigger to award points when order status changes to approved/finished
CREATE TRIGGER award_points_on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_order_finish();