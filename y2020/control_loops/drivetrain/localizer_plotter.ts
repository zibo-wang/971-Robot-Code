// Provides a plot for debugging robot state-related issues.
import {AosPlotter} from 'org_frc971/aos/network/www/aos_plotter';
import * as proxy from 'org_frc971/aos/network/www/proxy';
import * as configuration from 'org_frc971/aos/configuration_generated';
import {BLUE, BROWN, CYAN, GREEN, PINK, RED, WHITE} from 'org_frc971/aos/network/www/colors';
import {MessageHandler, TimestampedMessage} from 'org_frc971/aos/network/www/aos_plotter';
import {Point} from 'org_frc971/aos/network/www/plotter';
import {Table} from 'org_frc971/aos/network/www/reflection';
import {ByteBuffer} from 'org_frc971/external/com_github_google_flatbuffers/ts/byte-buffer';

import Connection = proxy.Connection;
import Schema = configuration.reflection.Schema;

const TIME = AosPlotter.TIME;
const DEFAULT_WIDTH = AosPlotter.DEFAULT_WIDTH;
const DEFAULT_HEIGHT = AosPlotter.DEFAULT_HEIGHT;


export function plotLocalizer(conn: Connection, element: Element) : void {
  const aosPlotter = new AosPlotter(conn);
  const localizerDebug =
      aosPlotter.addMessageSource('/drivetrain', 'y2020.control_loops.drivetrain.LocalizerDebug');
  const imageMatch =
      aosPlotter.addMessageSource('/pi1/camera', 'frc971.vision.sift.ImageMatchResult');

  var currentTop = 0;

  const imageAcceptedPlot = aosPlotter.addPlot(
      element, [0, currentTop], [DEFAULT_WIDTH, DEFAULT_HEIGHT]);
  currentTop += DEFAULT_HEIGHT;
  imageAcceptedPlot.plot.getAxisLabels().setTitle('Image Acceptance');
  imageAcceptedPlot.plot.getAxisLabels().setXLabel(TIME);
  imageAcceptedPlot.plot.getAxisLabels().setYLabel('[bool]');
  imageAcceptedPlot.plot.setDefaultYRange([-0.05, 1.05]);

  imageAcceptedPlot.addMessageLine(localizerDebug, ['matches[]', 'accepted'])
      .setColor(RED)
      .setDrawLine(false);

  const impliedXPlot = aosPlotter.addPlot(
      element, [0, currentTop], [DEFAULT_WIDTH, DEFAULT_HEIGHT]);
  currentTop += DEFAULT_HEIGHT;
  impliedXPlot.plot.getAxisLabels().setTitle('Implied Robot X');
  impliedXPlot.plot.getAxisLabels().setXLabel(TIME);
  impliedXPlot.plot.getAxisLabels().setYLabel('[m]');

  impliedXPlot.addMessageLine(localizerDebug, ['matches[]', 'implied_robot_x'])
      .setColor(RED)
      .setDrawLine(false);
  impliedXPlot.addMessageLine(imageMatch, ['camera_poses[]', 'field_to_camera', 'data[3]'])
      .setColor(BLUE)
      .setDrawLine(false);

  const impliedYPlot = aosPlotter.addPlot(
      element, [0, currentTop], [DEFAULT_WIDTH, DEFAULT_HEIGHT]);
  currentTop += DEFAULT_HEIGHT;
  impliedYPlot.plot.getAxisLabels().setTitle('Implied Robot Y');
  impliedYPlot.plot.getAxisLabels().setXLabel(TIME);
  impliedYPlot.plot.getAxisLabels().setYLabel('[m]');

  impliedYPlot.addMessageLine(localizerDebug, ['matches[]', 'implied_robot_y'])
      .setColor(RED)
      .setDrawLine(false);
  impliedYPlot.addMessageLine(imageMatch, ['camera_poses[]', 'field_to_camera', 'data[7]'])
      .setColor(BLUE)
      .setDrawLine(false);

  const impliedHeadingPlot = aosPlotter.addPlot(
      element, [0, currentTop], [DEFAULT_WIDTH, DEFAULT_HEIGHT]);
  currentTop += DEFAULT_HEIGHT;
  impliedHeadingPlot.plot.getAxisLabels().setTitle('Implied Robot Theta');
  impliedHeadingPlot.plot.getAxisLabels().setXLabel(TIME);
  impliedHeadingPlot.plot.getAxisLabels().setYLabel('[rad]');

  impliedHeadingPlot.addMessageLine(localizerDebug, ['matches[]', 'implied_robot_theta'])
      .setColor(RED)
      .setDrawLine(false);

  const impliedTurretGoalPlot = aosPlotter.addPlot(
      element, [0, currentTop], [DEFAULT_WIDTH, DEFAULT_HEIGHT]);
  currentTop += DEFAULT_HEIGHT;
  impliedTurretGoalPlot.plot.getAxisLabels().setTitle('Implied Turret Goal');
  impliedTurretGoalPlot.plot.getAxisLabels().setXLabel(TIME);
  impliedTurretGoalPlot.plot.getAxisLabels().setYLabel('[rad]');

  impliedTurretGoalPlot.addMessageLine(localizerDebug, ['matches[]', 'implied_turret_goal'])
      .setColor(RED)
      .setDrawLine(false);

  const imageTimingPlot = aosPlotter.addPlot(
      element, [0, currentTop], [DEFAULT_WIDTH, DEFAULT_HEIGHT]);
  currentTop += DEFAULT_HEIGHT;
  imageTimingPlot.plot.getAxisLabels().setTitle('Timing Plot');
  imageTimingPlot.plot.getAxisLabels().setXLabel(TIME);
  imageTimingPlot.plot.getAxisLabels().setYLabel('[ns]');

  imageTimingPlot.addMessageLine(localizerDebug, ['matches[]', 'image_age_sec'])
      .setColor(RED)
      .setDrawLine(false);
}