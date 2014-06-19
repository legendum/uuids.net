#!/usr/bin/env ruby

UUIDS_ROOT = ENV['UUIDS_ROOT'] || File.expand_path('../..', __FILE__)
UUIDS_PORT = ENV['UUIDS_PORT'] || '2219'

God.pid_file_directory = "#{UUIDS_ROOT}/tmp/pids"

God.watch do |w|
  w.name = "uuids"
  w.interval = 5.seconds
  w.start = "#{UUIDS_ROOT}/server/uuids.js --port=#{UUIDS_PORT}"
  w.stop = "env killall node"
  w.start_grace = 10.seconds
  w.restart_grace = 10.seconds            
  w.log = "#{UUIDS_ROOT}/logs/uuid-server.log"

  w.start_if do |start|
    start.condition(:process_running) do |c|
      c.interval = 5.seconds
      c.running = false
    end
  end
end
