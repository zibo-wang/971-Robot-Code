#include "y2022/control_loops/drivetrain/localizer.h"

namespace y2022 {
namespace control_loops {
namespace drivetrain {

Localizer::Localizer(
    aos::EventLoop *event_loop,
    const frc971::control_loops::drivetrain::DrivetrainConfig<double>
        &dt_config)
    : event_loop_(event_loop),
      dt_config_(dt_config),
      ekf_(dt_config),
      localizer_output_fetcher_(
          event_loop_->MakeFetcher<frc971::controls::LocalizerOutput>(
              "/localizer")),
      clock_offset_fetcher_(
          event_loop_->MakeFetcher<aos::message_bridge::ServerStatistics>(
              "/aos")) {
  ekf_.set_ignore_accel(true);

  event_loop->OnRun([this, event_loop]() {
    ekf_.ResetInitialState(event_loop->monotonic_now(),
                           HybridEkf::State::Zero(), ekf_.P());
  });

  target_selector_.set_has_target(false);
}

void Localizer::Reset(
    aos::monotonic_clock::time_point t,
    const frc971::control_loops::drivetrain::HybridEkf<double>::State &state) {
  // Go through and clear out all of the fetchers so that we don't get behind.
  localizer_output_fetcher_.Fetch();
  ekf_.ResetInitialState(t, state.cast<float>(), ekf_.P());
}

void Localizer::Update(const Eigen::Matrix<double, 2, 1> &U,
                       aos::monotonic_clock::time_point now,
                       double left_encoder, double right_encoder,
                       double gyro_rate, const Eigen::Vector3d &accel) {
  ekf_.UpdateEncodersAndGyro(left_encoder, right_encoder, gyro_rate,
                             U.cast<float>(), accel.cast<float>(), now);
  if (localizer_output_fetcher_.Fetch()) {
    clock_offset_fetcher_.Fetch();
    bool message_bridge_connected = true;
    std::chrono::nanoseconds monotonic_offset{0};
    if (clock_offset_fetcher_.get() != nullptr) {
      for (const auto connection : *clock_offset_fetcher_->connections()) {
        if (connection->has_node() && connection->node()->has_name() &&
            connection->node()->name()->string_view() == "imu") {
          if (connection->has_monotonic_offset()) {
            monotonic_offset =
                std::chrono::nanoseconds(connection->monotonic_offset());
          } else {
            // If we don't have a monotonic offset, that means we aren't
            // connected, in which case we should break the loop but shouldn't
            // populate the offset.
            message_bridge_connected = false;
          }
          break;
        }
      }
    }
    if (!message_bridge_connected) {
      return;
    }
    aos::monotonic_clock::time_point capture_time(
        std::chrono::nanoseconds(
            localizer_output_fetcher_->monotonic_timestamp_ns()) -
        monotonic_offset);
    // TODO: Finish implementing simple x/y/theta updater with state_at_capture.
    // TODO: Implement turret/camera processing logic on pi side.
    const std::optional<State> state_at_capture =
        ekf_.LastStateBeforeTime(capture_time);
    Eigen::Matrix<float, HybridEkf::kNOutputs, HybridEkf::kNStates> H;
    H.setZero();
    H(0, StateIdx::kX) = 1;
    H(1, StateIdx::kY) = 1;
    H(2, StateIdx::kTheta) = 1;
    const Eigen::Vector3f Z{
        static_cast<float>(localizer_output_fetcher_->x()),
        static_cast<float>(localizer_output_fetcher_->y()),
        static_cast<float>(localizer_output_fetcher_->theta())};
    Eigen::Matrix3f R = Eigen::Matrix3f::Zero();
    R.diagonal() << 0.01, 0.01, 1e-4;
    const Input U_correct = ekf_.MostRecentInput();
    ekf_.Correct(
        Eigen::Vector3f::Zero(), &U_correct, {},
        [H, state_at_capture, Z](const State &,
                                 const Input &) -> Eigen::Vector3f {
          Eigen::Vector3f error = H * state_at_capture.value() - Z;
          error(2) = aos::math::NormalizeAngle(error(2));
          return error;
        },
        [H](const State &) { return H; }, R, now);
  }
}

}  // namespace drivetrain
}  // namespace control_loops
}  // namespace y2022