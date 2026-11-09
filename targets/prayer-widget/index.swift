import WidgetKit
import SwiftUI

@main
struct RatbWidgets: WidgetBundle {
  var body: some Widget {
    PrayerTimesWidget()
    TodayPrayersWidget()
    VerseOfTheDayWidget()
  }
}
